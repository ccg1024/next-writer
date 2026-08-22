import { inject, injectable } from 'inversify';
import type { WorkspaceSearchRequest, WorkspaceSearchResponse } from '_types';
import IIpcHandler from '../../interface/ipc-handler';
import IWorkspaceIndexService from '../../interface/workspace-index-service';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class SearchWorkspaceHandler implements IIpcHandler<typeof IPC_CHANNEL.SEARCH_WORKSPACE> {
  channel = IPC_CHANNEL.SEARCH_WORKSPACE;

  constructor(@inject(TYPES.IWorkspaceIndexService) private workspaceIndex: IWorkspaceIndexService) {}

  handle(data: WorkspaceSearchRequest): Promise<WorkspaceSearchResponse> {
    return this.workspaceIndex.search(data);
  }
}

export default SearchWorkspaceHandler;
