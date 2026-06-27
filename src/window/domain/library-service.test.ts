/// <reference types="jest" />

import 'reflect-metadata';
import nodeFs from 'fs';
import nodeOs from 'os';
import nodePath from 'path';
import { ROOT_LIBRARY_ID } from 'src/config/env';
import { RootLibraryTree } from '_types';
import FileSystem from '../infrastructure/file-system';
import PathResolver from '../infrastructure/path-resolver';
import IAppPathStore from '../interface/app-path-store';
import ILibraryTreeStore from '../interface/library-tree-store';
import LibraryService from './library-service';

describe('LibraryService ID based operations', () => {
  let rootDir: string;
  let libraryTree: RootLibraryTree;
  let service: LibraryService;

  beforeEach(async () => {
    rootDir = await nodeFs.promises.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'next-writer-library-'));
    libraryTree = {
      id: ROOT_LIBRARY_ID,
      children: []
    };
    const appPathStore = createAppPathStore();
    service = new LibraryService(
      new FileSystem(),
      appPathStore,
      createLibraryTreeStore(),
      new PathResolver(appPathStore)
    );
  });

  afterEach(async () => {
    await nodeFs.promises.rm(rootDir, { recursive: true, force: true });
  });

  it('renames a folder by id and returns the latest tree', async () => {
    const oldFolderPath = nodePath.join(rootDir, 'drafts');
    const oldNotePath = nodePath.join(oldFolderPath, 'note.md');
    const newFolderPath = nodePath.join(rootDir, 'archive');
    await nodeFs.promises.mkdir(oldFolderPath);
    await nodeFs.promises.writeFile(oldNotePath, 'content');
    libraryTree.children = [
      {
        id: 'folder-id',
        name: 'drafts',
        type: 'folder',
        birthTime: '',
        modifiedTime: '',
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
      }
    ];

    const result = await service.updateLibrary({ operate: 'rename', id: 'folder-id', name: 'archive' });

    expect(result.children[0].name).toBe('archive');
    await expect(nodeFs.promises.stat(oldFolderPath)).rejects.toThrow();
    await expect(nodeFs.promises.readFile(nodePath.join(newFolderPath, 'note.md'), { encoding: 'utf8' })).resolves.toBe(
      'content'
    );
  });

  it('renames a file by id', async () => {
    await nodeFs.promises.writeFile(nodePath.join(rootDir, 'note.md'), 'content');
    libraryTree.children = [
      {
        id: 'note-id',
        name: 'note',
        type: 'file',
        birthTime: '',
        modifiedTime: '',
        children: []
      }
    ];

    const result = await service.updateLibrary({ operate: 'rename', id: 'note-id', name: 'renamed' });

    expect(result.children[0].name).toBe('renamed');
    await expect(nodeFs.promises.stat(nodePath.join(rootDir, 'note.md'))).rejects.toThrow();
    await expect(nodeFs.promises.readFile(nodePath.join(rootDir, 'renamed.md'), { encoding: 'utf8' })).resolves.toBe(
      'content'
    );
  });

  it('rejects duplicate sibling names for the same type', async () => {
    await nodeFs.promises.writeFile(nodePath.join(rootDir, 'first.md'), '');
    await nodeFs.promises.writeFile(nodePath.join(rootDir, 'second.md'), '');
    libraryTree.children = [
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
    ];

    await expect(service.updateLibrary({ operate: 'rename', id: 'second-id', name: 'first' })).rejects.toThrow(
      'The library name already exists.'
    );
  });

  it('rejects empty names and path separators', async () => {
    libraryTree.children = [
      {
        id: 'note-id',
        name: 'note',
        type: 'file',
        birthTime: '',
        modifiedTime: '',
        children: []
      }
    ];

    await expect(service.updateLibrary({ operate: 'rename', id: 'note-id', name: '   ' })).rejects.toThrow(
      'The library name is empty.'
    );
    await expect(service.updateLibrary({ operate: 'rename', id: 'note-id', name: 'bad/name' })).rejects.toThrow(
      'The library name cannot contain path separators.'
    );
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
