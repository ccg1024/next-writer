import { inject, injectable } from 'inversify';
import { ReadConfigResponse } from '_types';
import { IPC_CHANNEL } from '../ipc/ipc-contract';
import INextIpcHandler from '../interface/next-ipc-handler';
import INextStoreSystem from '../interface/next-store-system';
import { TYPES } from '../types';

/**
 * Reading renderer config and library tree data
 */
@injectable()
class ReadConfigHandler implements INextIpcHandler<typeof IPC_CHANNEL.READ_CONFIG> {
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
