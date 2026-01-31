import { IPC_CHANNEL } from 'src/tools/config';
import INextIpcHandler from '../interface/next-ipc-handler';
import INextStoreSystem from '../interface/next-store-system';
import { nextWriterC } from '../inversify.config';
import { TYPES } from '../types';

/**
 * Reading renderer config and library tree data
 */
const readConfigHandler: INextIpcHandler = {
  type: IPC_CHANNEL.READ_CONFIG,
  apply: async () => {
    const store = nextWriterC.get<INextStoreSystem>(TYPES.INextStoreSystem);

    return {
      config: store.getConfig('renderConfig'),
      libTree: store.getConfig('libraryTree')
    };
  }
};

Object.setPrototypeOf(readConfigHandler, null);

export default readConfigHandler;
