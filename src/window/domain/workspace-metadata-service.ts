import nodePath from 'path';
import { inject, injectable } from 'inversify';
import { WORKSPACE_METADATA_NAME, WORKSPACE_METADATA_VERSION, WORKSPACE_RECENT_DOCUMENT_LIMIT } from 'src/config/env';
import type {
  LibraryTree,
  RootLibraryTree,
  UpdateWorkspaceMetadataRequest,
  WorkspaceMetadata,
  WorkspaceRecentDocument
} from '_types';
import IAppPathStore from '../interface/app-path-store';
import IFileSystem from '../interface/file-system';
import ILibraryTreeStore from '../interface/library-tree-store';
import IWorkspaceMetadataService from '../interface/workspace-metadata-service';
import { TYPES } from '../types';

type PersistedWorkspaceMetadata = WorkspaceMetadata & {
  rootDir: string;
};

type WorkspaceFile = {
  id: string;
  relativePath: string;
  fullPath: string;
};

@injectable()
/** 持久化工作区访问元数据，并以当前文库树清理或修正失效记录。 */
class WorkspaceMetadataService implements IWorkspaceMetadataService {
  private metadata = createEmptyMetadata();
  private initializedRoot = '';
  private initializationPromise: Promise<void> | null = null;
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(
    @inject(TYPES.IFileSystem) private fileSystem: IFileSystem,
    @inject(TYPES.IAppPathStore) private appPathStore: IAppPathStore,
    @inject(TYPES.ILibraryTreeStore) private libraryTreeStore: ILibraryTreeStore
  ) {}

  async getMetadata(): Promise<WorkspaceMetadata> {
    await this.ensureInitialized();
    return this.enqueue(async () => {
      const changed = await this.cleanInvalidRecords(this.libraryTreeStore.getTree());
      if (changed) {
        await this.persist();
      }
      return this.snapshot();
    });
  }

  async recordOpened(id: string, path: string): Promise<WorkspaceMetadata> {
    await this.ensureInitialized();
    return this.enqueue(async () => {
      const relativePath = this.toRelativePath(path);
      this.metadata.recent = [
        { id, path: relativePath, openedAt: Date.now() },
        ...this.metadata.recent.filter(item => item.id !== id)
      ].slice(0, this.metadata.recentLimit);
      await this.persist();
      return this.snapshot();
    });
  }

  async updateMetadata(request: UpdateWorkspaceMetadataRequest): Promise<WorkspaceMetadata> {
    await this.ensureInitialized();
    return this.enqueue(async () => {
      if (request.action === 'clear-recent') {
        this.metadata.recent = [];
      } else {
        const file = this.collectWorkspaceFiles(this.libraryTreeStore.getTree()).find(item => item.id === request.id);
        if (!file || !(await this.fileSystem.exists(file.fullPath))) {
          throw new Error('文档不存在或已失效');
        }
        const target = request.action === 'set-favorite' ? 'favoriteIds' : 'pinnedIds';
        this.metadata[target] = updateIdSet(this.metadata[target], request.id, request.value);
      }
      await this.persist();
      return this.snapshot();
    });
  }

  async syncLibraryTree(tree: RootLibraryTree): Promise<void> {
    await this.ensureInitialized();
    await this.enqueue(async () => {
      if (await this.cleanInvalidRecords(tree)) {
        await this.persist();
      }
    });
  }

  private async ensureInitialized(): Promise<void> {
    const rootDir = this.appPathStore.getRootDir();
    if (this.initializedRoot === rootDir && this.initializationPromise) {
      return this.initializationPromise;
    }
    this.initializedRoot = rootDir;
    this.metadata = createEmptyMetadata();
    this.operationQueue = Promise.resolve();
    this.initializationPromise = (async () => {
      const metadataPath = this.getMetadataPath();
      if (await this.fileSystem.exists(metadataPath)) {
        try {
          const parsed = JSON.parse(await this.fileSystem.readFile(metadataPath, { encoding: 'utf8' }));
          this.metadata = migrateMetadata(parsed, rootDir);
        } catch {
          this.metadata = createEmptyMetadata();
        }
      }
      await this.cleanInvalidRecords(this.libraryTreeStore.getTree());
      await this.persist();
    })();
    return this.initializationPromise;
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    let result: T;
    const next = this.operationQueue.then(async () => {
      result = await operation();
    });
    this.operationQueue = next.catch(() => undefined);
    return next.then(() => result);
  }

  private async cleanInvalidRecords(tree: RootLibraryTree): Promise<boolean> {
    const files = this.collectWorkspaceFiles(tree);
    const referencedIds = new Set([
      ...this.metadata.recent.map(item => item.id),
      ...this.metadata.favoriteIds,
      ...this.metadata.pinnedIds
    ]);
    const accessibleFiles = new Map<string, WorkspaceFile>();
    await Promise.all(
      files
        .filter(file => referencedIds.has(file.id))
        .map(async file => {
          if (await this.fileSystem.exists(file.fullPath)) {
            accessibleFiles.set(file.id, file);
          }
        })
    );

    let changed = false;
    const nextRecent = this.metadata.recent.reduce<WorkspaceRecentDocument[]>((records, record) => {
      const file = accessibleFiles.get(record.id);
      if (!file) {
        changed = true;
        return records;
      }
      const nextRecord = file.relativePath === record.path ? record : { ...record, path: file.relativePath };
      changed ||= nextRecord !== record;
      if (!records.some(item => item.id === record.id)) {
        records.push(nextRecord);
      } else {
        changed = true;
      }
      return records;
    }, []);
    const nextFavorites = Array.from(new Set(this.metadata.favoriteIds.filter(id => accessibleFiles.has(id))));
    const nextPinned = Array.from(new Set(this.metadata.pinnedIds.filter(id => accessibleFiles.has(id))));
    changed ||=
      nextRecent.length > this.metadata.recentLimit ||
      nextFavorites.length !== this.metadata.favoriteIds.length ||
      nextPinned.length !== this.metadata.pinnedIds.length;

    if (changed) {
      this.metadata = {
        ...this.metadata,
        recent: nextRecent.slice(0, this.metadata.recentLimit),
        favoriteIds: nextFavorites,
        pinnedIds: nextPinned,
        invalidPathsCleanedAt: Date.now()
      };
    }
    return changed;
  }

  private collectWorkspaceFiles(tree: RootLibraryTree): WorkspaceFile[] {
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
          relativePath,
          fullPath: nodePath.resolve(rootDir, ...parentTokens, `${node.name}.md`)
        });
      });
    };
    visit(tree?.children ?? [], []);
    return files;
  }

  private async persist(): Promise<void> {
    const path = this.getMetadataPath();
    const persisted: PersistedWorkspaceMetadata = {
      ...this.metadata,
      rootDir: this.appPathStore.getRootDir()
    };
    await this.fileSystem.writeFile(`${path}.tmp`, JSON.stringify(persisted, null, 2));
    await this.fileSystem.rename(`${path}.tmp`, path);
  }

  private snapshot(): WorkspaceMetadata {
    return JSON.parse(JSON.stringify(this.metadata));
  }

  private getMetadataPath(): string {
    return nodePath.join(this.appPathStore.getConfigDir(), WORKSPACE_METADATA_NAME);
  }

  private toRelativePath(path: string): string {
    return nodePath.relative(this.appPathStore.getRootDir(), path).split(nodePath.sep).join(nodePath.posix.sep);
  }
}

function createEmptyMetadata(): WorkspaceMetadata {
  return {
    version: WORKSPACE_METADATA_VERSION,
    recent: [],
    favoriteIds: [],
    pinnedIds: [],
    recentLimit: WORKSPACE_RECENT_DOCUMENT_LIMIT,
    invalidPathsCleanedAt: 0
  };
}

function migrateMetadata(value: unknown, rootDir: string): WorkspaceMetadata {
  if (!isRecord(value) || (typeof value.rootDir === 'string' && value.rootDir !== rootDir)) {
    return createEmptyMetadata();
  }
  const recentSource = Array.isArray(value.recent)
    ? value.recent
    : Array.isArray(value.recentDocuments)
      ? value.recentDocuments
      : [];
  const favoriteSource = Array.isArray(value.favoriteIds)
    ? value.favoriteIds
    : Array.isArray(value.favoriteDocumentIds)
      ? value.favoriteDocumentIds
      : [];
  const pinnedSource = Array.isArray(value.pinnedIds)
    ? value.pinnedIds
    : Array.isArray(value.pinnedDocumentIds)
      ? value.pinnedDocumentIds
      : [];
  const recentLimit =
    typeof value.recentLimit === 'number' && Number.isInteger(value.recentLimit) && value.recentLimit > 0
      ? value.recentLimit
      : WORKSPACE_RECENT_DOCUMENT_LIMIT;

  return {
    version: WORKSPACE_METADATA_VERSION,
    recent: recentSource.map(parseRecentDocument).filter((item): item is WorkspaceRecentDocument => item !== null),
    favoriteIds: favoriteSource.filter(isNonEmptyString),
    pinnedIds: pinnedSource.filter(isNonEmptyString),
    recentLimit,
    invalidPathsCleanedAt:
      typeof value.invalidPathsCleanedAt === 'number' && Number.isFinite(value.invalidPathsCleanedAt)
        ? value.invalidPathsCleanedAt
        : 0
  };
}

function parseRecentDocument(value: unknown): WorkspaceRecentDocument | null {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.path)) {
    return null;
  }
  const openedAt =
    typeof value.openedAt === 'number' && Number.isFinite(value.openedAt)
      ? value.openedAt
      : typeof value.lastOpenedAt === 'number' && Number.isFinite(value.lastOpenedAt)
        ? value.lastOpenedAt
        : null;
  return openedAt === null ? null : { id: value.id, path: value.path, openedAt };
}

function updateIdSet(ids: string[], id: string, enabled: boolean): string[] {
  return enabled ? [id, ...ids.filter(item => item !== id)] : ids.filter(item => item !== id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

export default WorkspaceMetadataService;
