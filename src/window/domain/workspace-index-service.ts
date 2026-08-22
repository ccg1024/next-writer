import nodePath from 'path';
import { inject, injectable } from 'inversify';
import {
  WORKSPACE_INDEX_MAX_FILE_SIZE,
  WORKSPACE_INDEX_NAME,
  WORKSPACE_INDEX_VERSION,
  WORKSPACE_SEARCH_DEFAULT_LIMIT,
  WORKSPACE_SEARCH_MAX_LIMIT
} from 'src/config/env';
import type {
  LibraryTree,
  WorkspaceIndexStatus,
  WorkspaceSearchMatchField,
  WorkspaceSearchRequest,
  WorkspaceSearchResponse,
  WorkspaceSearchResult
} from '_types';
import IAppPathStore from '../interface/app-path-store';
import IFileSystem from '../interface/file-system';
import ILibraryTreeStore from '../interface/library-tree-store';
import IWorkspaceIndexService from '../interface/workspace-index-service';
import { TYPES } from '../types';

type WorkspaceIndexEntry = {
  id: string;
  path: string;
  name: string;
  title?: string;
  titleLine?: number;
  titleColumn?: number;
  content: string;
  modifiedTime: number;
  size: number;
};

type PersistedWorkspaceIndex = {
  version: number;
  rootDir: string;
  generatedAt: number;
  entries: WorkspaceIndexEntry[];
};

type WorkspaceFile = {
  id: string;
  name: string;
  fullPath: string;
  relativePath: string;
};

@injectable()
/** 在主进程维护可持久化的 Markdown 内容快照，并提供分页全文搜索。 */
class WorkspaceIndexService implements IWorkspaceIndexService {
  private entries = new Map<string, WorkspaceIndexEntry>();
  private status: WorkspaceIndexStatus = 'building';
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(
    @inject(TYPES.IFileSystem) private fileSystem: IFileSystem,
    @inject(TYPES.IAppPathStore) private appPathStore: IAppPathStore,
    @inject(TYPES.ILibraryTreeStore) private libraryTreeStore: ILibraryTreeStore
  ) {}

  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    this.initialized = true;
    this.initializationPromise = (async () => {
      try {
        await this.loadPersistedIndex();
      } catch {
        this.entries.clear();
      }
      await this.rebuild();
    })();
    return this.initializationPromise;
  }

  rebuild(): Promise<void> {
    return this.enqueue(async () => {
      this.status = 'building';
      try {
        const files = this.collectWorkspaceFiles();
        const nextEntries = new Map<string, WorkspaceIndexEntry>();

        for (let index = 0; index < files.length; index += 1) {
          const entry = await this.readEntry(files[index], this.entries.get(files[index].id));
          if (entry) {
            nextEntries.set(entry.id, entry);
          }
          if (index > 0 && index % 25 === 0) {
            await yieldToEventLoop();
          }
        }

        this.entries = nextEntries;
        await this.persistIndex();
        this.status = 'ready';
      } catch (error) {
        this.status = 'error';
        throw error;
      }
    });
  }

  updatePath(path: string): Promise<void> {
    return this.enqueue(async () => {
      const normalizedPath = nodePath.resolve(path);
      const file = this.collectWorkspaceFiles().find(item => nodePath.resolve(item.fullPath) === normalizedPath);

      if (file) {
        const entry = await this.readEntry(file);
        if (entry) {
          this.entries.set(entry.id, entry);
        } else {
          this.entries.delete(file.id);
        }
      } else {
        const relativePath = this.toRelativePath(normalizedPath);
        this.entries.forEach((entry, id) => {
          if (entry.path === relativePath || entry.path.startsWith(`${relativePath}/`)) {
            this.entries.delete(id);
          }
        });
      }

      await this.persistIndex();
      this.status = 'ready';
    });
  }

  async search(request: WorkspaceSearchRequest): Promise<WorkspaceSearchResponse> {
    await this.initialize();
    await this.operationQueue;

    const query = request.query.trim();
    const offset = Math.max(0, Math.floor(request.offset ?? 0));
    const limit = Math.min(
      WORKSPACE_SEARCH_MAX_LIMIT,
      Math.max(1, Math.floor(request.limit ?? WORKSPACE_SEARCH_DEFAULT_LIMIT))
    );
    const results = Array.from(this.entries.values())
      .map(entry => findEntryMatch(entry, query, Boolean(request.caseSensitive), Boolean(request.fuzzy)))
      .filter((result): result is WorkspaceSearchResult => result !== null);

    return {
      results: results.slice(offset, offset + limit),
      total: results.length,
      hasMore: offset + limit < results.length,
      indexStatus: this.status
    };
  }

  destroy(): void {
    this.entries.clear();
    this.status = 'building';
    this.initialized = false;
    this.initializationPromise = null;
    this.operationQueue = Promise.resolve();
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    const next = this.operationQueue.then(operation);
    this.operationQueue = next.catch(() => undefined);
    return next;
  }

  private collectWorkspaceFiles(): WorkspaceFile[] {
    const rootDir = this.appPathStore.getRootDir();
    const files: WorkspaceFile[] = [];

    const visit = (nodes: LibraryTree[], parentTokens: string[]) => {
      nodes.forEach(node => {
        const tokens = [...parentTokens, node.name];
        if (node.type === 'folder') {
          visit(node.children, tokens);
          return;
        }

        const relativePath = `${tokens.join(nodePath.posix.sep)}.md`;
        files.push({
          id: node.id,
          name: node.name,
          relativePath,
          fullPath: nodePath.resolve(rootDir, ...parentTokens, `${node.name}.md`)
        });
      });
    };

    visit(this.libraryTreeStore.getTree()?.children ?? [], []);
    return files;
  }

  private async readEntry(file: WorkspaceFile, current?: WorkspaceIndexEntry): Promise<WorkspaceIndexEntry | null> {
    try {
      const stat = await this.fileSystem.stat(file.fullPath);
      if (current && current.modifiedTime === stat.mtimeMs && current.size === stat.size) {
        return { ...current, path: file.relativePath, name: file.name };
      }

      const content =
        stat.size <= WORKSPACE_INDEX_MAX_FILE_SIZE
          ? await this.fileSystem.readFile(file.fullPath, { encoding: 'utf8' })
          : '';
      const heading = findMarkdownTitle(content);
      return {
        id: file.id,
        path: file.relativePath,
        name: file.name,
        title: heading?.title,
        titleLine: heading?.line,
        titleColumn: heading?.column,
        content,
        modifiedTime: stat.mtimeMs,
        size: stat.size
      };
    } catch {
      return null;
    }
  }

  private async loadPersistedIndex(): Promise<void> {
    const indexPath = this.getIndexPath();
    if (!(await this.fileSystem.exists(indexPath))) {
      return;
    }

    const parsed = JSON.parse(
      await this.fileSystem.readFile(indexPath, { encoding: 'utf8' })
    ) as PersistedWorkspaceIndex;
    if (
      parsed.version !== WORKSPACE_INDEX_VERSION ||
      parsed.rootDir !== this.appPathStore.getRootDir() ||
      !Array.isArray(parsed.entries) ||
      !parsed.entries.every(isWorkspaceIndexEntry)
    ) {
      return;
    }
    this.entries = new Map(parsed.entries.map(entry => [entry.id, entry]));
  }

  private async persistIndex(): Promise<void> {
    const indexPath = this.getIndexPath();
    const temporaryPath = `${indexPath}.tmp`;
    const persisted: PersistedWorkspaceIndex = {
      version: WORKSPACE_INDEX_VERSION,
      rootDir: this.appPathStore.getRootDir(),
      generatedAt: Date.now(),
      entries: Array.from(this.entries.values())
    };
    await this.fileSystem.writeFile(temporaryPath, JSON.stringify(persisted));
    await this.fileSystem.rename(temporaryPath, indexPath);
  }

  private getIndexPath(): string {
    return nodePath.join(this.appPathStore.getConfigDir(), WORKSPACE_INDEX_NAME);
  }

  private toRelativePath(path: string): string {
    return nodePath.relative(this.appPathStore.getRootDir(), path).split(nodePath.sep).join(nodePath.posix.sep);
  }
}

function findMarkdownTitle(content: string): { title: string; line: number; column: number } | null {
  const lines = content.split(/\r?\n/);
  const lineIndex = lines.findIndex(line => /^ {0,3}#{1,6}\s+\S/.test(line));
  if (lineIndex < 0) {
    return null;
  }
  const prefix = lines[lineIndex].match(/^ {0,3}#{1,6}\s+/)?.[0] ?? '';
  return {
    title: lines[lineIndex].slice(prefix.length).trim(),
    line: lineIndex + 1,
    column: prefix.length + 1
  };
}

function findEntryMatch(
  entry: WorkspaceIndexEntry,
  query: string,
  caseSensitive: boolean,
  fuzzy: boolean
): WorkspaceSearchResult | null {
  const filenameMatch = findTextMatch(entry.name, query, caseSensitive, fuzzy);
  if (filenameMatch) {
    return createResult(entry, 'filename', 1, entry.name, filenameMatch, 1);
  }

  if (entry.title) {
    const titleMatch = findTextMatch(entry.title, query, caseSensitive, fuzzy);
    if (titleMatch) {
      return createResult(
        entry,
        'title',
        entry.titleLine ?? 1,
        entry.title,
        titleMatch,
        (entry.titleColumn ?? 1) + titleMatch.start
      );
    }
  }

  const lines = entry.content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const contentMatch = findTextMatch(lines[index], query, caseSensitive, fuzzy);
    if (contentMatch) {
      return createResult(entry, 'content', index + 1, lines[index], contentMatch);
    }
  }
  return null;
}

function findTextMatch(
  text: string,
  query: string,
  caseSensitive: boolean,
  fuzzy: boolean
): { start: number; end: number } | null {
  const haystack = caseSensitive ? text : text.toLocaleLowerCase();
  const needle = caseSensitive ? query : query.toLocaleLowerCase();
  const exactStart = haystack.indexOf(needle);
  if (exactStart >= 0) {
    return { start: exactStart, end: exactStart + query.length };
  }
  if (!fuzzy) {
    return null;
  }

  let needleIndex = 0;
  let start = -1;
  let end = -1;
  for (let index = 0; index < haystack.length && needleIndex < needle.length; index += 1) {
    if (haystack[index] === needle[needleIndex]) {
      start = start < 0 ? index : start;
      end = index + 1;
      needleIndex += 1;
    }
  }
  return needleIndex === needle.length ? { start, end } : null;
}

function createResult(
  entry: WorkspaceIndexEntry,
  field: WorkspaceSearchMatchField,
  line: number,
  text: string,
  match: { start: number; end: number },
  column = match.start + 1
): WorkspaceSearchResult {
  const contextStart = Math.max(0, match.start - 70);
  const contextEnd = Math.min(text.length, match.end + 110);
  return {
    id: entry.id,
    path: entry.path,
    name: entry.name,
    title: entry.title,
    field,
    line,
    column,
    context: text.slice(contextStart, contextEnd),
    matchStart: match.start - contextStart,
    matchEnd: match.end - contextStart
  };
}

function yieldToEventLoop(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

function isWorkspaceIndexEntry(value: unknown): value is WorkspaceIndexEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as Partial<WorkspaceIndexEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.path === 'string' &&
    typeof entry.name === 'string' &&
    (entry.title === undefined || typeof entry.title === 'string') &&
    (entry.titleLine === undefined || typeof entry.titleLine === 'number') &&
    (entry.titleColumn === undefined || typeof entry.titleColumn === 'number') &&
    typeof entry.content === 'string' &&
    typeof entry.modifiedTime === 'number' &&
    Number.isFinite(entry.modifiedTime) &&
    typeof entry.size === 'number' &&
    Number.isFinite(entry.size)
  );
}

export default WorkspaceIndexService;
