import { inject, injectable } from 'inversify';
import IIpcHandler from '../../interface/ipc-handler';
import INextStoreSystem from '../../interface/next-store-system';
import { TYPES } from '../../types';
import type { RuntimeConfigResponse } from '../ipc-contract';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class RuntimeHandler implements IIpcHandler<typeof IPC_CHANNEL.RUNTIME> {
  channel = IPC_CHANNEL.RUNTIME;

  constructor(@inject(TYPES.INextStoreSystem) private store: INextStoreSystem) {}

  async handle(): Promise<RuntimeConfigResponse> {
    const menuStatus = this.store.getConfig('menuStatus');
    return { menuStatus };
  }
}

export default RuntimeHandler;
