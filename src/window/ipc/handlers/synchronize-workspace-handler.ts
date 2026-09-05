import { inject, injectable } from 'inversify';
import type { RootLibraryTree } from '_types';
import IIpcHandler from '../../interface/ipc-handler';
import ILibraryService from '../../interface/library-service';
import ILibraryTreeStore from '../../interface/library-tree-store';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class SynchronizeWorkspaceHandler implements IIpcHandler<typeof IPC_CHANNEL.SYNCHRONIZE_WORKSPACE> {
  channel = IPC_CHANNEL.SYNCHRONIZE_WORKSPACE;

  constructor(
    @inject(TYPES.ILibraryService) private libraryService: ILibraryService,
    @inject(TYPES.ILibraryTreeStore) private libraryTreeStore: ILibraryTreeStore
  ) {}

  async handle(): Promise<RootLibraryTree> {
    await this.libraryService.synchronizeLibrary();
    return this.libraryTreeStore.getTree();
  }
}

export default SynchronizeWorkspaceHandler;
