import { IPC_CHANNEL } from 'src/tools/config';
import { inject, injectable } from 'inversify';
import { ReadConfigResponse } from '_types';
import INextIpcHandler from '../interface/next-ipc-handler';
import INextStoreSystem from '../interface/next-store-system';
import { TYPES } from '../types';

/**
 * Reading renderer config and library tree data
 */
@injectable()
class ReadConfigHandler implements INextIpcHandler<undefined, ReadConfigResponse> {
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
