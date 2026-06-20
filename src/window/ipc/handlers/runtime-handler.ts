import { inject, injectable } from 'inversify';
import IIpcHandler from '../../interface/ipc-handler';
import IMenuStateStore from '../../interface/menu-state-store';
import { TYPES } from '../../types';
import type { RuntimeConfigResponse } from '../ipc-contract';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class RuntimeHandler implements IIpcHandler<typeof IPC_CHANNEL.RUNTIME> {
  channel = IPC_CHANNEL.RUNTIME;

  constructor(@inject(TYPES.IMenuStateStore) private menuStateStore: IMenuStateStore) {}

  async handle(): Promise<RuntimeConfigResponse> {
    const menuStatus = this.menuStateStore.getStatus();
    return { menuStatus };
  }
}

export default RuntimeHandler;
