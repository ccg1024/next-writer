/// <reference types="jest" />

import 'reflect-metadata';
import nodeFs from 'fs';
import nodeOs from 'os';
import nodePath from 'path';
import { CacheContent, LibraryTree } from '_types';
import FileSystem from '../infrastructure/file-system';
import IAppPathStore from '../interface/app-path-store';
import IDocumentCacheService from '../interface/document-cache-service';
import ILibraryTreeStore from '../interface/library-tree-store';
import IPathResolver from '../interface/path-resolver';
import DocumentService from './document-service';

class MemoryCache implements IDocumentCacheService {
  private cache: Record<string, CacheContent> = {};

  init(): void {
    this.cache = {};
  }

  getCache(key: string): CacheContent | null {
    return this.cache[key] ?? null;
  }

  addCache(key: string, cacheContent: CacheContent): void {
    this.cache[key] = cacheContent;
  }

  update(key: string, updateContent: Partial<CacheContent>): void {
    this.cache[key] = {
      ...this.cache[key],
      ...updateContent
    };
  }

  hasCache(key: string): boolean {
    return !!this.cache[key];
  }

  removeCache(key: string): void {
    delete this.cache[key];
  }

  hasModified(): boolean {
    return Object.values(this.cache).some(item => item.isChange);
  }

  destroy(): void {
    this.init();
  }
}

describe('DocumentService cache revisions', () => {
  let rootDir: string;
  let libraryTree: LibraryTree;
  let cache: MemoryCache;
  let service: DocumentService;

  beforeEach(async () => {
    rootDir = await nodeFs.promises.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'next-writer-document-'));
    await nodeFs.promises.writeFile(nodePath.join(rootDir, 'note.md'), 'saved', { encoding: 'utf8' });

    libraryTree = {
      name: 'root',
      type: 'folder',
      birthTime: '',
      modifiedTime: '',
      children: [
        {
          name: 'note',
          type: 'file',
          birthTime: '',
          modifiedTime: '',
          children: []
        }
      ]
    };
    cache = new MemoryCache();
    service = new DocumentService(
      new FileSystem(),
      createAppPathStore(),
      createLibraryTreeStore(),
      cache,
      createPathResolver()
    );
  });

  afterEach(async () => {
    await nodeFs.promises.rm(rootDir, { recursive: true, force: true });
  });

  it('ignores stale dirty cache updates that arrive after a save', async () => {
    const notePath = nodePath.join(rootDir, 'note.md');

    await service.updateCache({ path: './note', content: 'dirty', isChange: true, revision: 1 });
    await service.writeFile({ path: './note', content: 'saved cleanly', nameInRuntime: 'note', revision: 2 });
    await service.updateCache({ path: './note', content: 'dirty', isChange: true, revision: 1 });

    expect(cache.getCache(notePath)).toEqual({
      isChange: false,
      content: 'saved cleanly',
      revision: 2
    });
    expect(cache.hasModified()).toBe(false);
  });

  it('does not clear a newer dirty cache entry when an older save finishes', async () => {
    const notePath = nodePath.join(rootDir, 'note.md');

    await service.updateCache({ path: './note', content: 'newer dirty content', isChange: true, revision: 3 });
    await service.writeFile({ path: './note', content: 'older saved content', nameInRuntime: 'note', revision: 2 });

    expect(cache.getCache(notePath)).toEqual({
      isChange: true,
      content: 'newer dirty content',
      revision: 3
    });
    expect(cache.hasModified()).toBe(true);
  });

  it('blocks stale updates on the old path after a renamed save', async () => {
    const oldPath = nodePath.join(rootDir, 'note.md');
    const newPath = nodePath.join(rootDir, 'renamed.md');

    await service.updateCache({ path: './note', content: 'dirty', isChange: true, revision: 1 });
    await service.writeFile({ path: './note', content: 'renamed cleanly', nameInRuntime: 'renamed', revision: 2 });
    await service.updateCache({ path: './note', content: 'dirty', isChange: true, revision: 1 });

    expect(cache.getCache(oldPath)).toBeNull();
    expect(cache.getCache(newPath)).toEqual({
      isChange: false,
      content: 'renamed cleanly',
      revision: 2
    });
    expect(cache.hasModified()).toBe(false);
  });

  function createAppPathStore(): IAppPathStore {
    return {
      setPaths(paths: { rootDir?: string }) {
        rootDir = paths.rootDir ?? rootDir;
      },
      setRootDir(nextRootDir: string) {
        rootDir = nextRootDir;
      },
      getRootDir() {
        return rootDir;
      },
      getConfigDir() {
        return '';
      },
      getLogDir() {
        return '';
      }
    };
  }

  function createLibraryTreeStore(): ILibraryTreeStore {
    return {
      setTree(tree: LibraryTree) {
        libraryTree = tree;
      },
      getTree() {
        return libraryTree;
      },
      async updateTree<T>(updater: (tree: LibraryTree) => T | Promise<T>): Promise<T> {
        return updater(libraryTree);
      }
    };
  }

  function createPathResolver(): IPathResolver {
    return {
      resolveWithinRoot(targetRootDir: string, targetPath: string): string {
        const root = nodePath.resolve(targetRootDir);
        const target = nodePath.resolve(targetPath);
        const relative = nodePath.relative(root, target);

        if (relative.startsWith('..') || nodePath.isAbsolute(relative)) {
          throw new Error('The path is outside of the allowed root.');
        }

        return target;
      },
      resolveLibraryPath(path: string, options?: { suffix?: string }) {
        const relativePath = path
          .split(nodePath.win32.sep)
          .join(nodePath.posix.sep)
          .replace(/^\.?\//, '');
        const suffix = options?.suffix ?? '';
        const pathWithSuffix = suffix && !relativePath.endsWith(suffix) ? `${relativePath}${suffix}` : relativePath;

        return {
          relativePath,
          fullPath: nodePath.join(rootDir, pathWithSuffix),
          pathToken: relativePath.split('/').filter(Boolean)
        };
      }
    };
  }
});
