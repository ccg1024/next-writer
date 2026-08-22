/// <reference types="jest" />

import 'reflect-metadata';
import nodeFs from 'fs';
import nodeOs from 'os';
import nodePath from 'path';
import { ROOT_LIBRARY_ID, WORKSPACE_METADATA_NAME, WORKSPACE_METADATA_VERSION } from 'src/config/env';
import type { ReadFileResponse, RootLibraryTree } from '_types';
import FileSystem from '../infrastructure/file-system';
import AppPathStore from '../state/app-path-store';
import LibraryTreeStore from '../state/library-tree-store';
import ReadFileHandler from '../ipc/handlers/read-file-handler';
import WorkspaceMetadataService from './workspace-metadata-service';

describe('WorkspaceMetadataService', () => {
  let rootDir: string;
  let configDir: string;
  let tree: RootLibraryTree;
  let treeStore: LibraryTreeStore;
  let service: WorkspaceMetadataService;

  beforeEach(async () => {
    rootDir = await nodeFs.promises.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'next-writer-metadata-'));
    configDir = nodePath.join(rootDir, '.config');
    await nodeFs.promises.mkdir(configDir);
    await nodeFs.promises.mkdir(nodePath.join(rootDir, 'drafts'));
    await nodeFs.promises.writeFile(nodePath.join(rootDir, 'drafts', 'first.md'), 'first');
    await nodeFs.promises.writeFile(nodePath.join(rootDir, 'drafts', 'second.md'), 'second');
    tree = createTree();
    treeStore = new LibraryTreeStore();
    treeStore.setTree(tree);
    const appPathStore = new AppPathStore();
    appPathStore.setPaths({ rootDir, configDir, logDir: nodePath.join(rootDir, '.logs') });
    service = new WorkspaceMetadataService(new FileSystem(), appPathStore, treeStore);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await nodeFs.promises.rm(rootDir, { recursive: true, force: true });
  });

  it('orders recent documents by successful open time and persists favorites and pins', async () => {
    jest.spyOn(Date, 'now').mockReturnValueOnce(10).mockReturnValueOnce(20);
    await service.recordOpened('first-id', nodePath.join(rootDir, 'drafts', 'first.md'));
    await service.recordOpened('second-id', nodePath.join(rootDir, 'drafts', 'second.md'));
    await service.updateMetadata({ action: 'set-favorite', id: 'first-id', value: true });
    await service.updateMetadata({ action: 'set-pinned', id: 'second-id', value: true });

    await expect(nodeFs.promises.readFile(nodePath.join(rootDir, 'drafts', 'first.md'), 'utf8')).resolves.toBe('first');
    await expect(nodeFs.promises.readFile(nodePath.join(rootDir, 'drafts', 'second.md'), 'utf8')).resolves.toBe(
      'second'
    );

    expect(await service.getMetadata()).toMatchObject({
      version: WORKSPACE_METADATA_VERSION,
      recent: [
        { id: 'second-id', path: 'drafts/second.md', openedAt: 20 },
        { id: 'first-id', path: 'drafts/first.md', openedAt: 10 }
      ],
      favoriteIds: ['first-id'],
      pinnedIds: ['second-id']
    });

    const appPathStore = new AppPathStore();
    appPathStore.setPaths({ rootDir, configDir });
    const restarted = new WorkspaceMetadataService(new FileSystem(), appPathStore, treeStore);
    await expect(restarted.getMetadata()).resolves.toMatchObject({
      favoriteIds: ['first-id'],
      pinnedIds: ['second-id']
    });
  });

  it('enforces the persisted recent document limit', async () => {
    await nodeFs.promises.writeFile(
      nodePath.join(configDir, WORKSPACE_METADATA_NAME),
      JSON.stringify({
        version: WORKSPACE_METADATA_VERSION,
        rootDir,
        recent: [],
        favoriteIds: [],
        pinnedIds: [],
        recentLimit: 1,
        invalidPathsCleanedAt: 0
      })
    );

    await service.recordOpened('first-id', nodePath.join(rootDir, 'drafts', 'first.md'));
    await service.recordOpened('second-id', nodePath.join(rootDir, 'drafts', 'second.md'));

    expect((await service.getMetadata()).recent.map(item => item.id)).toEqual(['second-id']);
  });

  it('migrates legacy fields, updates renamed paths, and removes deleted records', async () => {
    await nodeFs.promises.writeFile(
      nodePath.join(configDir, WORKSPACE_METADATA_NAME),
      JSON.stringify({
        version: 0,
        rootDir,
        recentDocuments: [{ id: 'first-id', path: 'drafts/first.md', lastOpenedAt: 5 }],
        favoriteDocumentIds: ['first-id'],
        pinnedDocumentIds: ['first-id']
      })
    );

    await expect(service.getMetadata()).resolves.toMatchObject({
      version: WORKSPACE_METADATA_VERSION,
      recent: [{ id: 'first-id', openedAt: 5 }],
      favoriteIds: ['first-id'],
      pinnedIds: ['first-id']
    });

    await nodeFs.promises.rename(
      nodePath.join(rootDir, 'drafts', 'first.md'),
      nodePath.join(rootDir, 'drafts', 'renamed.md')
    );
    tree.children[0].children[0].name = 'renamed';
    treeStore.setTree(tree);
    await service.syncLibraryTree(tree);
    expect((await service.getMetadata()).recent[0].path).toBe('drafts/renamed.md');

    await nodeFs.promises.rm(nodePath.join(rootDir, 'drafts', 'renamed.md'));
    tree.children[0].children = tree.children[0].children.filter(item => item.id !== 'first-id');
    treeStore.setTree(tree);
    await service.syncLibraryTree(tree);
    await expect(service.getMetadata()).resolves.toMatchObject({ recent: [], favoriteIds: [], pinnedIds: [] });
  });

  it('records access only after the read handler successfully opens a document', async () => {
    const response = {
      content: 'first',
      session: { id: 'first-id', path: nodePath.join(rootDir, 'drafts', 'first.md') }
    } as ReadFileResponse;
    const documentService = { readFile: jest.fn().mockResolvedValue(response) };
    const metadata = { recordOpened: jest.fn().mockResolvedValue(undefined) };
    const handler = new ReadFileHandler(documentService as never, metadata as never);

    await expect(handler.handle({ id: 'first-id' })).resolves.toBe(response);
    expect(metadata.recordOpened).toHaveBeenCalledWith('first-id', response.session.path);

    documentService.readFile.mockRejectedValueOnce(new Error('read failed'));
    await expect(handler.handle({ id: 'first-id' })).rejects.toThrow('read failed');
    expect(metadata.recordOpened).toHaveBeenCalledTimes(1);

    documentService.readFile.mockResolvedValueOnce(response);
    metadata.recordOpened.mockRejectedValueOnce(new Error('metadata unavailable'));
    await expect(handler.handle({ id: 'first-id' })).resolves.toBe(response);
  });

  function createTree(): RootLibraryTree {
    return {
      id: ROOT_LIBRARY_ID,
      children: [
        {
          id: 'drafts-id',
          name: 'drafts',
          type: 'folder',
          birthTime: '',
          modifiedTime: '',
          children: [
            {
              id: 'first-id',
              name: 'first',
              type: 'file',
              birthTime: '',
              modifiedTime: '',
              children: []
            },
            {
              id: 'second-id',
              name: 'second',
              type: 'file',
              birthTime: '',
              modifiedTime: '',
              children: []
            }
          ]
        }
      ]
    };
  }
});
