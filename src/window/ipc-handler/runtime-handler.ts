import { IPC_CHANNEL } from 'src/tools/config';
import { inject, injectable } from 'inversify';
import type { RuntimeRecord } from 'src/ui/modules/store';
import INextIpcHandler from '../interface/next-ipc-handler';
import INextStoreSystem from '../interface/next-store-system';
import { TYPES } from '../types';

@injectable()
class RuntimeHandler implements INextIpcHandler<undefined, RuntimeRecord> {
  channel = IPC_CHANNEL.RUNTIME;

  constructor(@inject(TYPES.INextStoreSystem) private store: INextStoreSystem) {}

  async handle(): Promise<RuntimeRecord> {
    const menuStatus = this.store.getConfig('menuStatus');
    return { menuStatus };
  }
}

export default RuntimeHandler;
