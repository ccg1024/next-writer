import { inject, injectable } from 'inversify';
import type { UpdateWorkspaceMetadataRequest, WorkspaceMetadata } from '_types';
import IIpcHandler from '../../interface/ipc-handler';
import IWorkspaceMetadataService from '../../interface/workspace-metadata-service';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class UpdateWorkspaceMetadataHandler implements IIpcHandler<typeof IPC_CHANNEL.UPDATE_WORKSPACE_METADATA> {
  channel = IPC_CHANNEL.UPDATE_WORKSPACE_METADATA;

  constructor(@inject(TYPES.IWorkspaceMetadataService) private workspaceMetadata: IWorkspaceMetadataService) {}

  handle(data: UpdateWorkspaceMetadataRequest): Promise<WorkspaceMetadata> {
    return this.workspaceMetadata.updateMetadata(data);
  }
}

export default UpdateWorkspaceMetadataHandler;
