import { inject, injectable } from 'inversify';
import IIpcHandler from '../../interface/ipc-handler';
import IRuntimeConfigStore from '../../interface/runtime-config-store';
import { TYPES } from '../../types';
import type { RuntimeConfigResponse } from '../ipc-contract';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class RuntimeHandler implements IIpcHandler<typeof IPC_CHANNEL.RUNTIME> {
  channel = IPC_CHANNEL.RUNTIME;

  constructor(@inject(TYPES.IRuntimeConfigStore) private store: IRuntimeConfigStore) {}

  async handle(): Promise<RuntimeConfigResponse> {
    const menuStatus = this.store.getConfig('menuStatus');
    return { menuStatus };
  }
}

export default RuntimeHandler;
