/// <reference types="jest" />

import 'reflect-metadata';
import nodeFs from 'fs';
import nodeOs from 'os';
import nodePath from 'path';
import { ROOT_LIBRARY_ID } from 'src/config/env';
import { CacheContent, RootLibraryTree } from '_types';
import FileSystem from '../infrastructure/file-system';
import IAppPathStore from '../interface/app-path-store';
import IDocumentCacheService from '../interface/document-cache-service';
import ILibraryTreeStore from '../interface/library-tree-store';
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
  let libraryTree: RootLibraryTree;
  let cache: MemoryCache;
  let service: DocumentService;

  beforeEach(async () => {
    rootDir = await nodeFs.promises.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'next-writer-document-'));
    await nodeFs.promises.writeFile(nodePath.join(rootDir, 'note.md'), 'saved', { encoding: 'utf8' });

    libraryTree = {
      id: ROOT_LIBRARY_ID,
      children: [
        {
          id: 'note-id',
          name: 'note',
          type: 'file',
          birthTime: '',
          modifiedTime: '',
          children: []
        }
      ]
    };
    cache = new MemoryCache();
    service = new DocumentService(new FileSystem(), createAppPathStore(), createLibraryTreeStore(), cache);
  });

  afterEach(async () => {
    await nodeFs.promises.rm(rootDir, { recursive: true, force: true });
  });

  it('ignores stale dirty cache updates that arrive after a save', async () => {
    await service.updateCache({ id: 'note-id', content: 'dirty', isChange: true, revision: 1 });
    await service.writeFile({ id: 'note-id', content: 'saved cleanly', revision: 2 });
    await service.updateCache({ id: 'note-id', content: 'dirty', isChange: true, revision: 1 });

    expect(cache.getCache('note-id')).toEqual({
      isChange: false,
      content: 'saved cleanly',
      revision: 2
    });
    expect(cache.hasModified()).toBe(false);
  });

  it('does not clear a newer dirty cache entry when an older save finishes', async () => {
    await service.updateCache({ id: 'note-id', content: 'newer dirty content', isChange: true, revision: 3 });
    await service.writeFile({ id: 'note-id', content: 'older saved content', revision: 2 });

    expect(cache.getCache('note-id')).toEqual({
      isChange: true,
      content: 'newer dirty content',
      revision: 3
    });
    expect(cache.hasModified()).toBe(true);
  });

  it('keeps cache identity stable after a file is renamed in the library tree', async () => {
    const oldPath = nodePath.join(rootDir, 'note.md');
    const newPath = nodePath.join(rootDir, 'renamed.md');

    await service.updateCache({ id: 'note-id', content: 'dirty', isChange: true, revision: 1 });
    await nodeFs.promises.rename(oldPath, newPath);
    libraryTree.children[0].name = 'renamed';
    await service.writeFile({ id: 'note-id', content: 'renamed cleanly', revision: 2 });
    await service.updateCache({ id: 'note-id', content: 'dirty', isChange: true, revision: 1 });

    expect(cache.getCache('note-id')).toEqual({
      isChange: false,
      content: 'renamed cleanly',
      revision: 2
    });
    await expect(nodeFs.promises.readFile(newPath, { encoding: 'utf8' })).resolves.toBe('renamed cleanly');
    expect(cache.hasModified()).toBe(false);
  });

  it('saves an opened note after its parent folder is renamed', async () => {
    const oldFolderPath = nodePath.join(rootDir, 'drafts');
    const newFolderPath = nodePath.join(rootDir, 'archive');
    await nodeFs.promises.mkdir(oldFolderPath);
    await nodeFs.promises.writeFile(nodePath.join(oldFolderPath, 'note.md'), 'saved', { encoding: 'utf8' });
    await nodeFs.promises.rename(oldFolderPath, newFolderPath);
    libraryTree.children = [
      {
        id: 'folder-id',
        name: 'archive',
        type: 'folder',
        birthTime: '',
        modifiedTime: '',
        children: [
          {
            id: 'nested-note-id',
            name: 'note',
            type: 'file',
            birthTime: '',
            modifiedTime: '',
            children: []
          }
        ]
      }
    ];

    await service.updateCache({ id: 'nested-note-id', content: 'dirty', isChange: true, revision: 1 });
    await service.writeFile({ id: 'nested-note-id', content: 'saved after folder rename', revision: 2 });

    await expect(nodeFs.promises.readFile(nodePath.join(newFolderPath, 'note.md'), { encoding: 'utf8' })).resolves.toBe(
      'saved after folder rename'
    );
    expect(cache.getCache('nested-note-id')).toEqual({
      isChange: false,
      content: 'saved after folder rename',
      revision: 2
    });
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
      setTree(tree: RootLibraryTree) {
        libraryTree = tree;
      },
      getTree() {
        return libraryTree;
      },
      async updateTree<T>(updater: (tree: RootLibraryTree) => T | Promise<T>): Promise<T> {
        return updater(libraryTree);
      }
    };
  }
});
