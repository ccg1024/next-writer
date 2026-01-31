import { IPC_CHANNEL } from 'src/tools/config';
import INextIpcHandler from '../interface/next-ipc-handler';
import INextStoreSystem from '../interface/next-store-system';
import { nextWriterC } from '../inversify.config';
import { TYPES } from '../types';

const runtimeHandler: INextIpcHandler = {
  type: IPC_CHANNEL.RUNTIME,
  apply: async () => {
    const store = nextWriterC.get<INextStoreSystem>(TYPES.INextStoreSystem);
    const menuStatus = store.getConfig('menuStatus');
    return { menuStatus };
  }
};

Object.setPrototypeOf(runtimeHandler, null);

export default runtimeHandler;
