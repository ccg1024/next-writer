import { inject, injectable } from 'inversify';
import type { WorkspaceSearchRequest, WorkspaceSearchResponse } from '_types';
import IIpcHandler from '../../interface/ipc-handler';
import IWorkspaceIndexService from '../../interface/workspace-index-service';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';
import IAppLogger from '../../interface/app-logger';

@injectable()
class SearchWorkspaceHandler implements IIpcHandler<typeof IPC_CHANNEL.SEARCH_WORKSPACE> {
  channel = IPC_CHANNEL.SEARCH_WORKSPACE;

  constructor(
    @inject(TYPES.IWorkspaceIndexService) private workspaceIndex: IWorkspaceIndexService,
    @inject(TYPES.IAppLogger) private appLogger: IAppLogger = { record: () => undefined }
  ) {}

  async handle(data: WorkspaceSearchRequest): Promise<WorkspaceSearchResponse> {
    const startedAt = Date.now();
    try {
      const response = await this.workspaceIndex.search(data);
      this.appLogger.record('workspace.search', 'success', {
        durationMs: Date.now() - startedAt,
        metadata: { resultCount: response.total }
      });
      return response;
    } catch (error) {
      this.appLogger.record('workspace.search', 'failure', { durationMs: Date.now() - startedAt, error });
      throw error;
    }
  }
}

export default SearchWorkspaceHandler;
