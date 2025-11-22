import nodePath from 'path';
import { IPC_CHANNEL } from 'src/tools/config';
import { ReadFileRequest, ReadFileResponse } from '_types';
import INextFileSystem from '../interface/next-file-system';
import INextIpcHandler from '../interface/next-ipc-handler';
import INextStoreSystem from '../interface/next-store-system';
import INextCacheSystem from '../interface/next-cache-system';
import { nextWriterC } from '../inversify.config';
import { TYPES } from '../types';

/**
 * Reading the specified file information
 */
const readFileHandler: INextIpcHandler = {
  type: IPC_CHANNEL.READ_FILE,
  apply: async (_: string, reqData: ReadFileRequest) => {
    const { path } = reqData || {};
    const store = nextWriterC.get<INextStoreSystem>(TYPES.INextStoreSystem);
    const fileSys = nextWriterC.get<INextFileSystem>(TYPES.INextFileSystem);
    const rootDir = store.getConfig('rootDir');
    const cache = nextWriterC.get<INextCacheSystem>(TYPES.INextCacheSystem);

    const fullPath = path.startsWith(rootDir) ? path : nodePath.join(rootDir, path + '.md');
    // Get cache
    const buffer = cache.getCache(fullPath);
    const content = buffer ? buffer.content : await fileSys.readFile(fullPath, { encoding: 'utf8' });

    // update cache
    if (!buffer) {
      cache.addCache(fullPath, { isChange: false, content });
    }
    const data: ReadFileResponse = { content };
    return { status: 0, data };
  }
};

Object.setPrototypeOf(readFileHandler, null);

export default readFileHandler;
