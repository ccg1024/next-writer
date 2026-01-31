import nodeFs from 'fs';
import { isTrulyEmpty } from 'src/tools/utils';
import { IPC_CHANNEL } from 'src/tools/config';
import { LibraryTree, UpdateLibRequest } from '_types';
import INextFileSystem from '../interface/next-file-system';
import INextIpcHandler from '../interface/next-ipc-handler';
import INextStoreSystem from '../interface/next-store-system';
import { nextWriterC } from '../inversify.config';
import { TYPES } from '../types';
import { parsePathInfo, findParentLibNode, persistLibTree } from '../utils/lib-tree-utils';

/**
 * Update library tree object, which locate in main process store
 * 处理文件夹操作：添加文件，删除文件，添加文件夹，删除文件夹，重命名文件夹，文件的重命名是写操作
 */
const updateLibHandler: INextIpcHandler = {
  type: IPC_CHANNEL.UPDATE_LIB,
  apply: async (_: string, data: UpdateLibRequest) => {
    const { operate, path, type, pathInRuntime } = data || {};
    const fileSys = nextWriterC.get<INextFileSystem>(TYPES.INextFileSystem);

    if (isTrulyEmpty(path)) {
      throw new Error('The library path is empty.');
    }

    if (type !== 'file' && type !== 'folder') {
      throw new Error('Some thing wrong with file type.');
    }

    const store = nextWriterC.get<INextStoreSystem>(TYPES.INextStoreSystem);
    const rootDir = store.getConfig('rootDir');

    const pathInfo = parsePathInfo(path, rootDir, fileSys);
    const pathInfoRuntime = pathInRuntime ? parsePathInfo(pathInRuntime, rootDir, fileSys) : null;

    if (!pathInfo || pathInfo.pathToken.length === 0) {
      throw new Error('The path is invalid.');
    }

    // 提取目标名称（⚠️ 会修改 pathInfo.pathToken 原数组）
    const targetName = pathInfo.pathToken.pop();
    const targetNameInRuntime = pathInfoRuntime ? pathInfoRuntime.pathToken.pop() : '';
    const libTree = store.getConfig('libraryTree');

    // 此时 pathInfo.pathToken 已不包含目标名称，可用于查找父节点
    const parentLib = findParentLibNode(libTree, pathInfo.pathToken);

    if (isTrulyEmpty(parentLib)) {
      throw new Error('Cannot find target library path');
    }

    let resolveData = null;
    switch (`${operate}-${type}`) {
      case 'add-file': {
        const notePath = pathInfo.fullPath + '.md';
        await fileSys.writeFile(notePath, '');
        const fileState = await nodeFs.promises.stat(notePath);
        const libToken: LibraryTree = {
          name: targetName,
          type: 'file',
          birthTime: fileState.birthtime.toLocaleString(),
          modifiedTime: fileState.mtime.toLocaleString(),
          children: []
        };
        parentLib.children.push(libToken);
        resolveData = libToken;
        break;
      }
      case 'add-folder': {
        await nodeFs.promises.mkdir(pathInfo.fullPath, { recursive: true });
        const folderState = await nodeFs.promises.stat(pathInfo.fullPath);
        const libToken: LibraryTree = {
          name: targetName,
          type: 'folder',
          birthTime: folderState.birthtime.toLocaleString(),
          modifiedTime: folderState.mtime.toLocaleString(),
          children: []
        };
        parentLib.children.push(libToken);
        resolveData = libToken;
        break;
      }
      case 'del-file': {
        await nodeFs.promises.rm(pathInfo.fullPath + '.md');
        parentLib.children = parentLib.children.filter(lib => !(lib.name === targetName && lib.type === 'file'));
        break;
      }
      case 'del-folder': {
        const targetToken = parentLib.children.find(lib => lib.name === targetName && lib.type === 'folder');
        if (targetToken.children.length > 0) {
          throw new Error('The folder content is not empty.');
        }
        await nodeFs.promises.rmdir(pathInfo.fullPath);
        parentLib.children = parentLib.children.filter(lib => !(lib.name === targetName && lib.type === 'folder'));
        break;
      }
      case 'update-folder': {
        const targetToken = parentLib.children.find(child => child.name === targetName && child.type === 'folder');
        if (!targetToken) {
          throw new Error('The library is not found.');
        }
        targetToken.name = targetNameInRuntime;
        await nodeFs.promises.rename(pathInfo.fullPath, pathInfoRuntime.fullPath);
        break;
      }
    }

    // Write libTree to root config info
    await persistLibTree(libTree, rootDir, store, fileSys);
    return resolveData ?? {};
  }
};

Object.setPrototypeOf(updateLibHandler, null);

export default updateLibHandler;
