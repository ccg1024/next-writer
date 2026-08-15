export type WorkspaceFileChange = {
  kind: 'change' | 'rename';
  path: string;
};

export type WorkspaceFileChangeListener = (change: WorkspaceFileChange) => void;

interface IWorkspaceFileWatcher {
  start(rootDir: string, listener: WorkspaceFileChangeListener): void;
  stop(): void;
}

export default IWorkspaceFileWatcher;
