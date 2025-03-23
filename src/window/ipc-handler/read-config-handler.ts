import { IPC_CHANNEL } from 'src/tools/config';
import INextIpcHandler from '../interface/next-ipc-handler';
import { INextStoreSystemType } from '../interface/next-store-system';
import { nextWriterC } from '../inversify.config';
import { TYPES } from '../types';

/**
 * Reading renderer config and library tree data
 */
const readConfigHandler: INextIpcHandler = {
  type: IPC_CHANNEL.READ_CONFIG,
  apply: async () => {
    const store = nextWriterC.get<INextStoreSystemType>(TYPES.INextStoreSystem);
    return {
      status: 0,
      data: {
        config: store.getConfig('renderConfig') ?? {},
        libTree: store.getConfig('libraryTree') ?? {}
      },
      message: ''
    };
  }
};

Object.setPrototypeOf(readConfigHandler, null);

export default readConfigHandler;
