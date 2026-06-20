import { inject, injectable } from 'inversify';
import { ReadConfigResponse } from '_types';
import IIpcHandler from '../../interface/ipc-handler';
import IRuntimeConfigStore from '../../interface/runtime-config-store';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

/**
 * Reading renderer config and library tree data
 */
@injectable()
class ReadConfigHandler implements IIpcHandler<typeof IPC_CHANNEL.READ_CONFIG> {
  channel = IPC_CHANNEL.READ_CONFIG;

  constructor(@inject(TYPES.IRuntimeConfigStore) private store: IRuntimeConfigStore) {}

  async handle(): Promise<ReadConfigResponse> {
    return {
      config: this.store.getConfig('renderConfig'),
      libTree: this.store.getConfig('libraryTree')
    };
  }
}

export default ReadConfigHandler;
