import { MAX_FILE_DESCRIPTION_LENGTH, ROOT_CONFIG_NAME } from 'src/config/env';
import nodeFs from 'fs';
import nodePath from 'path';
import { IPC_CHANNEL } from 'src/tools/config';
import { isTrulyEmpty } from 'src/tools/utils';
import { WriteFileRequest } from '_types';
import INextFileSystem from '../interface/next-file-system';
import INextIpcHandler from '../interface/next-ipc-handler';
import INextStoreSystem from '../interface/next-store-system';
import INextCacheSystem from '../interface/next-cache-system';
import { nextWriterC } from '../inversify.config';
import { TYPES } from '../types';

const writeFileHandler: INextIpcHandler = {
  type: IPC_CHANNEL.WIRTE_FILE,
  async apply(_: string, reqData: WriteFileRequest) {
    // The `path` is current file in location
    // The `nameInRuntime` is the changed file namt of `path`
    const { path, content, nameInRuntime } = reqData ?? {};
    const store = nextWriterC.get<INextStoreSystem>(TYPES.INextStoreSystem);
    const fileSys = nextWriterC.get<INextFileSystem>(TYPES.INextFileSystem);
    const cache = nextWriterC.get<INextCacheSystem>(TYPES.INextCacheSystem);
    const formatPath = fileSys.formatPath(path);
    const rootDir = store.getConfig('rootDir');

    // TODO: figure out path problem, with or without suffix
    let fullPath = formatPath.startsWith(rootDir) ? formatPath : nodePath.join(rootDir, formatPath + '.md');
    const relativePath = fullPath.substring(rootDir.length);
    const pathToken = relativePath.split('/').filter(token => !!token);

    if (pathToken.length === 0) {
      return Promise.reject(new Error('The path is invalid.'));
    }
    const targetName = nodePath.basename(pathToken.pop(), '.md');
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

    const target = parentLib.children.find(lib => lib.name === targetName);

    if (isTrulyEmpty(target)) {
      return Promise.reject(new Error('Some thing wrong when find target lib token'));
    }

    // If have
    if (!isTrulyEmpty(nameInRuntime)) {
      const dirname = nodePath.dirname(fullPath);
      const oldFullPath = fullPath;
      fullPath = nodePath.join(dirname, nameInRuntime + '.md');
      await nodeFs.promises.rename(oldFullPath, fullPath);

      // Update library tree token
      target.name = nameInRuntime;

      // Update cache
      if (cache.exitCache(oldFullPath)) {
        cache.removeCache(oldFullPath);
      }
    }
    try {
      await fileSys.writeFile(fullPath, content);
      // add cache
      cache.addCache(fullPath, { isChange: false, content });
      // update library Tree
      const newStat = nodeFs.promises.stat(fullPath);
      target.modifiedTime = (await newStat).mtime.toLocaleString();
      target.description = content.substring(0, MAX_FILE_DESCRIPTION_LENGTH);
      await fileSys.writeFile(nodePath.join(rootDir, ROOT_CONFIG_NAME), JSON.stringify(libTree, null, 2));
      store.setConfig('libraryTree', libTree);
    } catch (e) {
      // TODO: Error catch
      return { status: -1, data: null, message: '保存文件失败' };
    }

    // Update library tree
    await fileSys.writeFile(nodePath.join(rootDir, ROOT_CONFIG_NAME), JSON.stringify(libTree, null, 2));
    // Restore, althought it is not necessary, the above changes have affected the original object
    store.setConfig('libraryTree', libTree);
    return { status: 0, data: null, message: '' };
  }
};

export default writeFileHandler;
