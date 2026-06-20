import { inject, injectable } from 'inversify';
import { ReadConfigResponse } from '_types';
import IIpcHandler from '../../interface/ipc-handler';
import INextStoreSystem from '../../interface/next-store-system';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

/**
 * Reading renderer config and library tree data
 */
@injectable()
class ReadConfigHandler implements IIpcHandler<typeof IPC_CHANNEL.READ_CONFIG> {
  channel = IPC_CHANNEL.READ_CONFIG;

  constructor(@inject(TYPES.INextStoreSystem) private store: INextStoreSystem) {}

  async handle(): Promise<ReadConfigResponse> {
    return {
      config: this.store.getConfig('renderConfig'),
      libTree: this.store.getConfig('libraryTree')
    };
  }
}

export default ReadConfigHandler;
