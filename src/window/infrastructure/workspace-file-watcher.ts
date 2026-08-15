import nodeFs from 'fs';
import nodePath from 'path';
import { injectable } from 'inversify';
import IWorkspaceFileWatcher, { WorkspaceFileChangeListener } from '../interface/workspace-file-watcher';

@injectable()
/** 将工作区内 Markdown 文件变化规范化为路径事件，领域分类由 DocumentService 负责。 */
class WorkspaceFileWatcher implements IWorkspaceFileWatcher {
  private watcher: nodeFs.FSWatcher | null = null;
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  start(rootDir: string, listener: WorkspaceFileChangeListener): void {
    this.stop();
    this.watcher = nodeFs.watch(rootDir, { recursive: true }, (eventType, filename) => {
      const relativePath = filename?.toString();
      if (!relativePath || (eventType !== 'rename' && nodePath.extname(relativePath).toLowerCase() !== '.md')) {
        return;
      }

      const fullPath = nodePath.resolve(rootDir, relativePath);
      const pending = this.timers.get(fullPath);
      if (pending) {
        clearTimeout(pending);
      }
      this.timers.set(
        fullPath,
        setTimeout(() => {
          this.timers.delete(fullPath);
          listener({ kind: eventType, path: fullPath });
        }, 50)
      );
    });
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}

export default WorkspaceFileWatcher;
