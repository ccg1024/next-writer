import { MAX_FILE_DESCRIPTION_LENGTH } from 'src/config/env';
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
import { parsePathInfo, findParentLibNode, persistLibTree } from '../utils/lib-tree-utils';

const writeFileHandler: INextIpcHandler = {
  type: IPC_CHANNEL.WIRTE_FILE,
  async apply(_: string, reqData: WriteFileRequest) {
    // The `path` is current file in location
    // The `nameInRuntime` is the changed file namt of `path`
    const { path, content, nameInRuntime } = reqData ?? {};
    const store = nextWriterC.get<INextStoreSystem>(TYPES.INextStoreSystem);
    const fileSys = nextWriterC.get<INextFileSystem>(TYPES.INextFileSystem);
    const cache = nextWriterC.get<INextCacheSystem>(TYPES.INextCacheSystem);
    const rootDir = store.getConfig('rootDir');

    const pathInfo = parsePathInfo(path, rootDir, fileSys, { suffix: '.md' });

    if (!pathInfo || pathInfo.pathToken.length === 0) {
      throw new Error('The path is invalid.');
    }

    let fullPath = pathInfo.fullPath;
    const pathToken = pathInfo.pathToken;

    // 提取目标名称（⚠️ 会修改 pathToken 数组）
    const targetName = nodePath.basename(pathToken.pop(), '.md');
    const libTree = store.getConfig('libraryTree');

    // 此时 pathToken 已不包含目标名称，可用于查找父节点
    const parentLib = findParentLibNode(libTree, pathToken);

    if (isTrulyEmpty(parentLib)) {
      throw new Error('Cannot find target library path');
    }

    const target = parentLib.children.find(lib => lib.name === targetName);

    if (isTrulyEmpty(target)) {
      throw new Error('Some thing wrong when find target lib token');
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
    } catch (e) {
      throw new Error('保存文件失败');
    }

    // Update library tree
    await persistLibTree(libTree, rootDir, store, fileSys);
  }
};

export default writeFileHandler;
