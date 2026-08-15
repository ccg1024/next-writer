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
import IRecoveryDraftService from '../interface/recovery-draft-service';
import DocumentService from './document-service';
import DocumentSessionService from './document-session-service';
import SaveScheduler from './save-scheduler';
import RenderConfigStore from '../state/render-config-store';

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
  let renderConfigStore: RenderConfigStore;
  let recoveryDrafts: jest.Mocked<IRecoveryDraftService>;
  let saveScheduler: SaveScheduler;
  let fileSystem: FileSystem;

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
    renderConfigStore = new RenderConfigStore();
    renderConfigStore.setConfig({ autoSave: { enabled: false, delayMs: 1000 } });
    saveScheduler = new SaveScheduler();
    fileSystem = new FileSystem();
    recoveryDrafts = createRecoveryDraftService();
    service = new DocumentService(
      fileSystem,
      createAppPathStore(),
      createLibraryTreeStore(),
      cache,
      new DocumentSessionService(),
      renderConfigStore,
      saveScheduler,
      recoveryDrafts
    );
  });

  afterEach(async () => {
    saveScheduler.destroy();
    await nodeFs.promises.rm(rootDir, { recursive: true, force: true });
  });

  it('automatically saves the newest session content after the configured delay', async () => {
    jest.useFakeTimers();
    renderConfigStore.setConfig({ autoSave: { enabled: true, delayMs: 100 } });
    try {
      await service.updateSession({ id: 'note-id', content: 'automatically saved', revision: 1 });
      await expect(nodeFs.promises.readFile(nodePath.join(rootDir, 'note.md'), 'utf8')).resolves.toBe('saved');

      await jest.advanceTimersByTimeAsync(100);
      await saveScheduler.flush('note-id');

      await expect(nodeFs.promises.readFile(nodePath.join(rootDir, 'note.md'), 'utf8')).resolves.toBe(
        'automatically saved'
      );
      await expect(service.getSession({ id: 'note-id' })).resolves.toMatchObject({
        status: 'saved',
        localRevision: 1,
        savedRevision: 1
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps the newest content dirty when a save fails', async () => {
    await service.updateSession({ id: 'note-id', content: 'unsaved draft', revision: 1 });
    jest.spyOn(fileSystem, 'writeFile').mockRejectedValueOnce(new Error('disk unavailable'));

    await expect(service.writeFile({ id: 'note-id', content: 'unsaved draft', revision: 1 })).rejects.toThrow(
      '保存文件失败'
    );

    await expect(service.getSession({ id: 'note-id' })).resolves.toMatchObject({
      content: 'unsaved draft',
      savedContent: 'saved',
      status: 'save-error',
      localRevision: 1,
      savedRevision: 0
    });
    expect(cache.hasModified()).toBe(true);
    expect(recoveryDrafts.save).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'unsaved draft' }),
      'save-failure'
    );
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
    expect(recoveryDrafts.discard).not.toHaveBeenCalled();
    expect(recoveryDrafts.scheduleSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'newer dirty content' })
    );
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
    await expect(service.getSession({ id: 'note-id' })).resolves.toMatchObject({ path: newPath });
  });

  it('keeps independently opened document sessions isolated during rapid switching', async () => {
    await nodeFs.promises.writeFile(nodePath.join(rootDir, 'other.md'), 'other saved', { encoding: 'utf8' });
    libraryTree.children.push({
      id: 'other-id',
      name: 'other',
      type: 'file',
      birthTime: '',
      modifiedTime: '',
      children: []
    });

    await expect(service.getSession({ id: 'note-id' })).resolves.toMatchObject({
      content: 'saved',
      status: 'ready',
      localRevision: 0
    });
    await expect(service.getSession({ id: 'other-id' })).resolves.toMatchObject({
      content: 'other saved',
      status: 'ready',
      localRevision: 0
    });
    await expect(service.getSession({ id: 'note-id' })).resolves.toMatchObject({
      content: 'saved',
      status: 'ready',
      localRevision: 0
    });

    expect(cache.hasModified()).toBe(false);
  });

  it('rejects an out-of-order renderer update with an older revision', async () => {
    await service.updateSession({ id: 'note-id', content: 'newest draft', revision: 2 });
    await service.updateSession({ id: 'note-id', content: 'older draft', revision: 1 });

    await expect(service.getSession({ id: 'note-id' })).resolves.toMatchObject({
      content: 'newest draft',
      status: 'dirty',
      localRevision: 2
    });
    expect(cache.getCache('note-id')).toMatchObject({ content: 'newest draft', isChange: true, revision: 2 });
  });

  it('rejects conflicting content that reuses the current revision', async () => {
    await service.updateSession({ id: 'note-id', content: 'newest draft', revision: 1 });
    await service.updateSession({ id: 'note-id', content: 'conflicting draft', revision: 1 });

    await expect(service.getSession({ id: 'note-id' })).resolves.toMatchObject({
      content: 'newest draft',
      status: 'dirty',
      localRevision: 1
    });
  });

  it('cleans recovery state when edits return to the saved content', async () => {
    await service.updateSession({ id: 'note-id', content: 'draft', revision: 1 });
    await service.updateSession({ id: 'note-id', content: 'saved', revision: 2 });

    expect(recoveryDrafts.discard).toHaveBeenCalledWith('note-id');
    await expect(service.getSession({ id: 'note-id' })).resolves.toMatchObject({
      content: 'saved',
      status: 'saved'
    });
  });

  it('keeps the close timeout bounded when recovery storage and disk writes do not finish', async () => {
    jest.useFakeTimers();
    try {
      await service.updateSession({ id: 'note-id', content: 'draft', revision: 1 });
      recoveryDrafts.save.mockImplementation(() => new Promise(() => undefined));
      jest.spyOn(fileSystem, 'writeFile').mockImplementation(() => new Promise(() => undefined));

      const result = service.flushAll(100);
      await jest.advanceTimersByTimeAsync(100);

      await expect(result).resolves.toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('removes deleted documents from session, cache, pending saves, and recovery state', async () => {
    await service.updateSession({ id: 'note-id', content: 'draft', revision: 1 });
    const cancel = jest.spyOn(saveScheduler, 'cancel');

    service.removeDocument('note-id');

    expect(cancel).toHaveBeenCalledWith('note-id');
    expect(cache.getCache('note-id')).toBeNull();
    expect(recoveryDrafts.discard).toHaveBeenCalledWith('note-id');
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

  function createRecoveryDraftService(): jest.Mocked<IRecoveryDraftService> {
    return {
      initialize: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockReturnValue(null),
      save: jest.fn().mockImplementation(async session => ({
        version: 1,
        documentId: session.id,
        originalPath: session.path,
        content: session.content,
        revision: session.localRevision,
        createdAt: Date.now(),
        source: 'save-failure'
      })),
      scheduleSnapshot: jest.fn(),
      discard: jest.fn().mockResolvedValue(true),
      destroy: jest.fn()
    };
  }
});
