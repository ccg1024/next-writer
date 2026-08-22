import { inject, injectable } from 'inversify';
import type { WorkspaceMetadata } from '_types';
import IIpcHandler from '../../interface/ipc-handler';
import IWorkspaceMetadataService from '../../interface/workspace-metadata-service';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class GetWorkspaceMetadataHandler implements IIpcHandler<typeof IPC_CHANNEL.GET_WORKSPACE_METADATA> {
  channel = IPC_CHANNEL.GET_WORKSPACE_METADATA;

  constructor(@inject(TYPES.IWorkspaceMetadataService) private workspaceMetadata: IWorkspaceMetadataService) {}

  handle(): Promise<WorkspaceMetadata> {
    return this.workspaceMetadata.getMetadata();
  }
}

export default GetWorkspaceMetadataHandler;
