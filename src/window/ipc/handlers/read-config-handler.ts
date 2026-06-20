import { inject, injectable } from 'inversify';
import { ReadConfigResponse } from '_types';
import IIpcHandler from '../../interface/ipc-handler';
import ILibraryTreeStore from '../../interface/library-tree-store';
import IRenderConfigStore from '../../interface/render-config-store';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

/**
 * Reading renderer config and library tree data
 */
@injectable()
class ReadConfigHandler implements IIpcHandler<typeof IPC_CHANNEL.READ_CONFIG> {
  channel = IPC_CHANNEL.READ_CONFIG;

  constructor(
    @inject(TYPES.IRenderConfigStore) private renderConfigStore: IRenderConfigStore,
    @inject(TYPES.ILibraryTreeStore) private libraryTreeStore: ILibraryTreeStore
  ) {}

  async handle(): Promise<ReadConfigResponse> {
    return {
      config: this.renderConfigStore.getConfig(),
      libTree: this.libraryTreeStore.getTree()
    };
  }
}

export default ReadConfigHandler;
