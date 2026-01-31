import { IPC_CHANNEL } from 'src/tools/config';
import { UpdateCacheRequest } from '_types';
import INextIpcHandler from '../interface/next-ipc-handler';
import INextStoreSystem from '../interface/next-store-system';
import INextCacheSystem from '../interface/next-cache-system';
import { nextWriterC } from '../inversify.config';
import { TYPES } from '../types';
import nodePath from 'path';

const updateCacheHandler: INextIpcHandler = {
  type: IPC_CHANNEL.UPDATE_CACHE,
  async apply(_: string, reqData: UpdateCacheRequest) {
    const { path, content, isChange } = reqData ?? {};
    const store = nextWriterC.get<INextStoreSystem>(TYPES.INextStoreSystem);
    const cache = nextWriterC.get<INextCacheSystem>(TYPES.INextCacheSystem);
    const rootDir = store.getConfig('rootDir');

    const fullPath = path.startsWith(rootDir)
      ? path
      : nodePath.join(rootDir, path + '.md');

    // Update or add cache with isChange flag
    if (cache.exitCache(fullPath)) {
      cache.update(fullPath, { isChange, content });
    } else {
      cache.addCache(fullPath, { isChange, content });
    }

    return { success: true };
  }
};

export default updateCacheHandler;
