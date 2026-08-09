import { inject, injectable } from 'inversify';
import { DEFAULT_AUTO_SAVE_DELAY_MS, MAX_FILE_DESCRIPTION_LENGTH } from 'src/config/env';
import {
  DocumentSession,
  GetDocumentSessionRequest,
  ReadFileRequest,
  ReadFileResponse,
  RootLibraryTree,
  UpdateCacheRequest,
  UpdateDocumentSessionRequest,
  WriteFileRequest
} from '_types';
import IAppPathStore from '../interface/app-path-store';
import IDocumentCacheService from '../interface/document-cache-service';
import IFileSystem from '../interface/file-system';
import ILibraryTreeStore from '../interface/library-tree-store';
import IDocumentService from '../interface/document-service';
import IDocumentSessionService from '../interface/document-session-service';
import IRenderConfigStore from '../interface/render-config-store';
import ISaveScheduler from '../interface/save-scheduler';
import { isLibraryTreeNode, persistLibTree, resolveLibraryNodePath } from '../utils/lib-tree-utils';
import { TYPES } from '../types';

@injectable()
/**
 * 文档领域服务，协调磁盘文件、文档会话、编辑缓存和文库树元数据，保证它们使用同一份内容与修订号。
 */
class DocumentService implements IDocumentService {
  constructor(
    @inject(TYPES.IFileSystem) private fileSystem: IFileSystem,
    @inject(TYPES.IAppPathStore) private appPathStore: IAppPathStore,
    @inject(TYPES.ILibraryTreeStore) private libraryTreeStore: ILibraryTreeStore,
    @inject(TYPES.IDocumentCacheService) private cache: IDocumentCacheService,
    @inject(TYPES.IDocumentSessionService) private sessions: IDocumentSessionService,
    @inject(TYPES.IRenderConfigStore) private renderConfigStore: IRenderConfigStore,
    @inject(TYPES.ISaveScheduler) private saveScheduler: ISaveScheduler
  ) {}

  async readFile(data: ReadFileRequest): Promise<ReadFileResponse> {
    const { id } = data ?? {};
    const pathInfo = this.resolveFileNode(id);
    const session = await this.ensureSession(id, pathInfo.fullPath);

    return { content: session.content };
  }

  async writeFile(data: WriteFileRequest): Promise<RootLibraryTree> {
    let result = this.libraryTreeStore.getTree();
    await this.saveScheduler.enqueue(data.id, async () => {
      result = await this.persistDocument(data);
    });
    return result;
  }

  async flushDocument(id: string): Promise<{ session: DocumentSession; libTree: RootLibraryTree }> {
    const session = await this.getSession({ id });
    let libTree = this.libraryTreeStore.getTree();
    if (session.content !== session.savedContent) {
      await this.saveScheduler.enqueue(id, async () => {
        libTree = await this.persistCurrentSession(id);
      });
    } else {
      await this.saveScheduler.flush(id);
    }
    return { session: await this.getSession({ id }), libTree };
  }

  async flushAll(timeoutMs: number): Promise<boolean> {
    this.sessions.getAll().forEach(session => {
      if (session.content !== session.savedContent) {
        this.saveScheduler.schedule(session.id, 0, () => this.persistCurrentSession(session.id).then(() => undefined));
      }
    });
    try {
      return (await this.saveScheduler.flushAll(timeoutMs)) && !this.cache.hasModified();
    } catch {
      return false;
    }
  }

  private async persistDocument(data: WriteFileRequest): Promise<RootLibraryTree> {
    const { id, content, revision } = data ?? {};
    const rootDir = this.appPathStore.getRootDir();

    return this.libraryTreeStore.updateTree(async libTree => {
      const pathInfo = this.resolveFileNode(id, libTree);
      const session = await this.ensureSession(id, pathInfo.fullPath);
      const requestedRevision = revision === undefined ? undefined : this.normalizeRevision(revision);
      // 异步 IPC 可能乱序到达；旧修订不能覆盖更新内容，同修订但内容不同也视为冲突请求。
      if (
        requestedRevision !== undefined &&
        (requestedRevision < session.localRevision ||
          (requestedRevision === session.localRevision && content !== session.content))
      ) {
        return libTree;
      }

      const contentSession =
        content === session.content ? session : this.sessions.updateContent(id, content, requestedRevision);
      const savingSession = this.sessions.beginSave(id, contentSession.localRevision);
      try {
        await this.fileSystem.writeFile(pathInfo.fullPath, content);

        const newStat = await this.fileSystem.stat(pathInfo.fullPath);
        const savedSession = this.sessions.completeSave(id, content, savingSession.localRevision, newStat.mtimeMs);
        this.syncCache(savedSession);
        pathInfo.node.modifiedTime = newStat.mtime.toLocaleString();
        pathInfo.node.description = content.substring(0, MAX_FILE_DESCRIPTION_LENGTH);
      } catch (error) {
        const message = error instanceof Error ? error.message : '保存文件失败';
        this.syncCache(this.sessions.failSave(id, message, savingSession.localRevision));
        throw new Error('保存文件失败');
      }

      await persistLibTree(libTree, rootDir, this.fileSystem);
      return libTree;
    });
  }

  async updateCache(data: UpdateCacheRequest): Promise<{ success: boolean }> {
    const { id, content, revision } = data ?? {};
    const pathInfo = this.resolveFileNode(id);
    const session = await this.ensureSession(id, pathInfo.fullPath);
    if (this.isStaleContentUpdate(session, content, revision)) {
      return { success: true };
    }

    const nextSession = this.sessions.updateContent(id, content, revision);
    this.syncCache(nextSession);
    this.scheduleAutoSave(nextSession);

    return { success: true };
  }

  async getSession(data: GetDocumentSessionRequest): Promise<DocumentSession> {
    const { id } = data ?? {};
    const pathInfo = this.resolveFileNode(id);
    return this.ensureSession(id, pathInfo.fullPath);
  }

  async updateSession(data: UpdateDocumentSessionRequest): Promise<DocumentSession> {
    const { id, content, revision } = data ?? {};
    const pathInfo = this.resolveFileNode(id);
    const currentSession = await this.ensureSession(id, pathInfo.fullPath);
    if (this.isStaleContentUpdate(currentSession, content, revision)) {
      return currentSession;
    }

    const nextSession = this.sessions.updateContent(id, content, revision);
    this.syncCache(nextSession);
    this.scheduleAutoSave(nextSession);
    return nextSession;
  }

  private persistCurrentSession(id: string): Promise<RootLibraryTree> {
    const session = this.sessions.get(id);
    if (!session || session.content === session.savedContent) {
      return Promise.resolve(this.libraryTreeStore.getTree());
    }
    return this.persistDocument({ id, content: session.content, revision: session.localRevision });
  }

  private scheduleAutoSave(session: DocumentSession): void {
    const config = this.renderConfigStore.getConfig().autoSave;
    const enabled = typeof config !== 'object' || config === null || config.enabled !== false;
    if (!enabled) {
      return;
    }
    const configuredDelay = typeof config === 'object' && config !== null ? config.delayMs : undefined;
    const delayMs =
      typeof configuredDelay === 'number' && Number.isFinite(configuredDelay) && configuredDelay >= 0
        ? configuredDelay
        : DEFAULT_AUTO_SAVE_DELAY_MS;
    this.saveScheduler.schedule(session.id, delayMs, () =>
      this.persistCurrentSession(session.id).then(() => undefined)
    );
  }

  private async ensureSession(id: string, path: string): Promise<DocumentSession> {
    const existing = this.sessions.get(id);
    if (existing) {
      return this.sessions.updatePath(id, path);
    }

    const content = await this.fileSystem.readFile(path, { encoding: 'utf8' });
    const stat = await this.fileSystem.stat(path);
    const session = this.sessions.load(id, path, content, stat.mtimeMs);
    this.syncCache(session);
    return session;
  }

  private syncCache(session: DocumentSession): void {
    // 窗口关闭保护仍读取旧缓存结构，因此会话变更后需要同步一份兼容状态。
    const cacheContent = {
      isChange: session.content !== session.savedContent,
      content: session.content,
      revision: session.localRevision
    };
    if (this.cache.hasCache(session.id)) {
      this.cache.update(session.id, cacheContent);
    } else {
      this.cache.addCache(session.id, cacheContent);
    }
  }

  private resolveFileNode(id: string, libTree: RootLibraryTree = this.libraryTreeStore.getTree()) {
    const pathInfo = resolveLibraryNodePath(libTree, id, this.appPathStore.getRootDir());

    if (!isLibraryTreeNode(pathInfo.node) || pathInfo.node.type !== 'file') {
      throw new Error('The target library node is not a file.');
    }

    return {
      ...pathInfo,
      node: pathInfo.node
    };
  }

  private normalizeRevision(revision?: number): number {
    return typeof revision === 'number' && Number.isFinite(revision) ? revision : 0;
  }

  private isStaleContentUpdate(session: DocumentSession, content: string, revision?: number): boolean {
    if (revision === undefined || content === session.content) {
      return false;
    }

    return this.normalizeRevision(revision) <= session.localRevision;
  }
}

export default DocumentService;
