import type { RootLibraryTree, UpdateWorkspaceMetadataRequest, WorkspaceMetadata } from '_types';

interface IWorkspaceMetadataService {
  getMetadata(): Promise<WorkspaceMetadata>;
  recordOpened(id: string, path: string): Promise<WorkspaceMetadata>;
  updateMetadata(request: UpdateWorkspaceMetadataRequest): Promise<WorkspaceMetadata>;
  syncLibraryTree(tree: RootLibraryTree): Promise<void>;
}

export default IWorkspaceMetadataService;
