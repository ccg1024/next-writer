import { inject, injectable } from 'inversify';
import type { RuntimeConfigResponse } from '../ipc/ipc-contract';
import { IPC_CHANNEL } from '../ipc/ipc-contract';
import INextIpcHandler from '../interface/next-ipc-handler';
import INextStoreSystem from '../interface/next-store-system';
import { TYPES } from '../types';

@injectable()
class RuntimeHandler implements INextIpcHandler<typeof IPC_CHANNEL.RUNTIME> {
  channel = IPC_CHANNEL.RUNTIME;

  constructor(@inject(TYPES.INextStoreSystem) private store: INextStoreSystem) {}

  async handle(): Promise<RuntimeConfigResponse> {
    const menuStatus = this.store.getConfig('menuStatus');
    return { menuStatus };
  }
}

export default RuntimeHandler;
