import type { WorkspaceSearchRequest, WorkspaceSearchResponse } from '_types';

interface IWorkspaceIndexService {
  initialize(): Promise<void>;
  rebuild(): Promise<void>;
  updatePath(path: string): Promise<void>;
  search(request: WorkspaceSearchRequest): Promise<WorkspaceSearchResponse>;
  destroy(): void;
}

export default IWorkspaceIndexService;
