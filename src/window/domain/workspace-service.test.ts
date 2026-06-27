/// <reference types="jest" />

import 'reflect-metadata';
import nodeFs from 'fs';
import nodeOs from 'os';
import nodePath from 'path';
import { ROOT_CONFIG_NAME, ROOT_DIR_NAME, ROOT_LIBRARY_ID } from 'src/config/env';
import FileSystem from '../infrastructure/file-system';
import IConfigService from '../interface/config-service';
import AppPathStore from '../state/app-path-store';
import LibraryTreeStore from '../state/library-tree-store';
import WorkspaceService from './workspace-service';

describe('WorkspaceService', () => {
  const originalHome = process.env.HOME;
  let homeDir: string;

  beforeEach(async () => {
    homeDir = await nodeFs.promises.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'next-writer-workspace-'));
    process.env.HOME = homeDir;
  });

  afterEach(async () => {
    process.env.HOME = originalHome;
    await nodeFs.promises.rm(homeDir, { recursive: true, force: true });
  });

  it('migrates old library tree records by assigning persistent ids', async () => {
    const rootDir = nodePath.join(homeDir, 'documents', ROOT_DIR_NAME);
    const recordPath = nodePath.join(rootDir, ROOT_CONFIG_NAME);
    await nodeFs.promises.mkdir(rootDir, { recursive: true });
    await nodeFs.promises.writeFile(
      recordPath,
      JSON.stringify({
        children: [
          {
            name: 'drafts',
            type: 'folder',
            birthTime: '',
            modifiedTime: '',
            relativePath: './drafts',
            children: [
              {
                name: 'note',
                type: 'file',
                birthTime: '',
                modifiedTime: '',
                relativePath: './drafts/note',
                children: []
              }
            ]
          }
        ]
      })
    );
    const libraryTreeStore = new LibraryTreeStore();
    const workspaceService = new WorkspaceService(new FileSystem(), new AppPathStore(), libraryTreeStore, {
      initConfig: jest.fn().mockResolvedValue(undefined)
    } as unknown as IConfigService);

    await workspaceService.initWorkspace();

    const tree = libraryTreeStore.getTree();
    expect(tree.id).toBe(ROOT_LIBRARY_ID);
    expect(tree.children[0].id).toEqual(expect.any(String));
    expect(tree.children[0].children[0].id).toEqual(expect.any(String));

    const persisted = JSON.parse(await nodeFs.promises.readFile(recordPath, { encoding: 'utf8' }));
    expect(persisted.id).toBe(ROOT_LIBRARY_ID);
    expect(persisted.children[0].relativePath).toBeUndefined();
    expect(persisted.children[0].children[0].relativePath).toBeUndefined();
  });
});
