import nodeFs from 'fs';
import nodePath from 'path';
import { isTrulyEmpty } from 'src/tools/utils';
import { LibraryTree } from '_types';
import { ROOT_CONFIG_NAME } from 'bin/index.es';
import INextFileSystem from '../interface/next-file-system';
import INextIpcHandler from '../interface/next-ipc-handler';
import { INextStoreSystemType } from '../interface/next-store-system';
import { nextWriterC } from '../inversify.config';
import { TYPES } from '../types';

export type UpdateLibDTO = {
  operate: 'add' | 'del';
  path: string;
  type: 'file' | 'folder';
};
/**
 * Update library tree object, which locate in main process store
 */
const updateLibHandler: INextIpcHandler = {
  type: 'update-lib',
  apply: async (_: string, data: UpdateLibDTO) => {
    const { operate, path, type } = data || {};
    const fileSys = nextWriterC.get<INextFileSystem>(TYPES.INextFileSystem);
    const formatPath = fileSys.formatPath(path);

    if (isTrulyEmpty(formatPath)) {
      return Promise.reject(new Error('The library path is empty.'));
    }

    if (type !== 'file' && type !== 'folder') {
      return Promise.reject(new Error('Some thing wrong with file type.'));
    }

    const store = nextWriterC.get<INextStoreSystemType>(TYPES.INextStoreSystem);
    const rootDir = store.getConfig('rootDir');
    const relativePath = formatPath.startsWith(rootDir) ? formatPath.substring(rootDir.length) : formatPath;
    const fullPath = nodePath.join(rootDir, relativePath);
    const pathToken = relativePath.split('/').filter(token => !!token);

    if (pathToken.length === 0) {
      return Promise.reject(new Error('The path is invalid.'));
    }

    const targetName = pathToken.pop();
    const libTree = store.getConfig('libraryTree');

    // get target lib parent
    let parentLib = libTree;
    for (let i = 0; i < pathToken.length; i += 1) {
      if (parentLib === undefined || parentLib === null) {
        break;
      }
      parentLib = parentLib.children.find(lib => lib.name === pathToken[i] && lib.type === 'folder');
    }

    if (isTrulyEmpty(parentLib)) {
      return Promise.reject(new Error('Cannot find target library path'));
    }

    switch (`${operate}-${type}`) {
      case 'add-file': {
        const notePath = fullPath + '.md';
        await fileSys.writeFile(notePath, '');
        const fileState = await nodeFs.promises.stat(notePath);
        const libToken: LibraryTree = {
          name: targetName,
          type: 'file',
          birthTime: fileState.birthtime.toString(),
          modifiedTime: fileState.mtime.toString(),
          children: []
        };
        parentLib.children.push(libToken);
        break;
      }
      case 'add-folder': {
        await nodeFs.promises.mkdir(fullPath, { recursive: true });
        const folderState = await nodeFs.promises.stat(fullPath);
        const libToken: LibraryTree = {
          name: targetName,
          type: 'folder',
          birthTime: folderState.birthtime.toString(),
          modifiedTime: folderState.mtime.toString(),
          children: []
        };
        parentLib.children.push(libToken);
        break;
      }
      case 'del-file': {
        await nodeFs.promises.rm(fullPath + '.md');
        parentLib.children = parentLib.children.filter(lib => !(lib.name === targetName && lib.type === 'file'));
        break;
      }
      case 'del-folder': {
        if (parentLib.children.length > 0) {
          return Promise.reject(new Error('The folder content is not empty.'));
        }
        await nodeFs.promises.rm(fullPath);
        parentLib.children = parentLib.children.filter(lib => !(lib.name === targetName && lib.type === 'folder'));
        break;
      }
    }

    // Write libTree to root config info
    await fileSys.writeFile(nodePath.join(rootDir, ROOT_CONFIG_NAME), JSON.stringify(libTree, null, 2));
    // Restore, althought it is not necessary, the above changes have affected the original object
    store.setConfig('libraryTree', libTree);
    return { status: 0, data: {}, message: '' };
  }
};

Object.setPrototypeOf(updateLibHandler, null);

export default updateLibHandler;
