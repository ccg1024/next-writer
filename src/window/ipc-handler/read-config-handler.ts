import { IPC_CHANNEL } from 'src/tools/config';
import INextIpcHandler from '../interface/next-ipc-handler';
import { INextStoreSystemType } from '../interface/next-store-system';
import { nextWriterC } from '../inversify.config';
import { TYPES } from '../types';
import { ReadConfigResponse } from '_types';

/**
 * Reading renderer config and library tree data
 */
const readConfigHandler: INextIpcHandler = {
  type: IPC_CHANNEL.READ_CONFIG,
  apply: async () => {
    const store = nextWriterC.get<INextStoreSystemType>(TYPES.INextStoreSystem);

    const data: ReadConfigResponse = {
      config: store.getConfig('renderConfig', true),
      libTree: store.getConfig('libraryTree', true)
    };
    return { status: 0, data };
  }
};

Object.setPrototypeOf(readConfigHandler, null);

export default readConfigHandler;
