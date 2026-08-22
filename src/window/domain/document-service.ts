import nodePath from 'path';
import { inject, injectable } from 'inversify';
import { DEFAULT_AUTO_SAVE_DELAY_MS, MAX_FILE_DESCRIPTION_LENGTH } from 'src/config/env';
import {
  DocumentSession,
  ExternalDocumentChangeEvent,
  GetDocumentSessionRequest,
  ReadFileRequest,
  ReadFileResponse,
  RecoveryDraft,
  RendererListenerAction,
  ResolveDocumentConflictRequest,
  ResolveDocumentConflictResponse,
  RootLibraryTree,
  SaveDocumentCopyRequest,
  SaveDocumentCopyResponse,
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
import IRecoveryDraftService from '../interface/recovery-draft-service';
import ISaveScheduler from '../interface/save-scheduler';
import IWindowRegistry from '../interface/window-registry';
import {
  createLibraryNodeId,
  isLibraryTreeNode,
  persistLibTree,
  resolveLibraryNodePath
} from '../utils/lib-tree-utils';
import { TYPES } from '../types';

@injectable()
/**
 * 文档领域服务，协调磁盘文件、文档会话、编辑缓存和文库树元数据，保证它们使用同一份内容与修订号。
 */
class DocumentService implements IDocumentService {
  private readonly writesInProgress = new Map<string, string>();

  constructor(
    @inject(TYPES.IFileSystem) private fileSystem: IFileSystem,
    @inject(TYPES.IAppPathStore) private appPathStore: IAppPathStore,
    @inject(TYPES.ILibraryTreeStore) private libraryTreeStore: ILibraryTreeStore,
    @inject(TYPES.IDocumentCacheService) private cache: IDocumentCacheService,
    @inject(TYPES.IDocumentSessionService) private sessions: IDocumentSessionService,
    @inject(TYPES.IRenderConfigStore) private renderConfigStore: IRenderConfigStore,
    @inject(TYPES.ISaveScheduler) private saveScheduler: ISaveScheduler,
    @inject(TYPES.IRecoveryDraftService) private recoveryDrafts: IRecoveryDraftService,
    @inject(TYPES.IWindowRegistry) private windowRegistry: IWindowRegistry
  ) {}

  async readFile(data: ReadFileRequest): Promise<ReadFileResponse> {
    const { id } = data ?? {};
    const pathInfo = this.resolveFileNode(id);
    const session = await this.ensureSession(id, pathInfo.fullPath);

    return { content: session.content, session };
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
    if (session.status === 'conflict' || session.status === 'unavailable') {
      throw new Error('文档存在外部变更，保存已暂停');
    }
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
    // 关闭开始时立即备份，不让恢复目录 IO 延长保存调度器的超时上限。
    void this.saveCloseRecoveryDrafts();
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

  private async saveCloseRecoveryDrafts(): Promise<void> {
    await Promise.all(
      this.sessions
        .getAll()
        .filter(
          session =>
            session.content !== session.savedContent ||
            session.status === 'conflict' ||
            session.status === 'unavailable'
        )
        .map(session => this.recoveryDrafts.save(session, 'close-timeout').catch(() => undefined))
    );
  }

  private async persistDocument(
    data: WriteFileRequest,
    expectedDisk?: { content?: string; missing?: boolean }
  ): Promise<RootLibraryTree> {
    const { id, content, revision } = data ?? {};
    const rootDir = this.appPathStore.getRootDir();

    return this.libraryTreeStore.updateTree(async libTree => {
      const pathInfo = this.resolveFileNode(id, libTree);
      const session = await this.ensureSession(id, pathInfo.fullPath);
      if (!expectedDisk && (session.status === 'conflict' || session.status === 'unavailable')) {
        throw new Error('文档存在外部变更，保存已暂停');
      }
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
        await this.assertDiskBaseline(savingSession, pathInfo.fullPath, expectedDisk);
        this.writesInProgress.set(nodePath.resolve(pathInfo.fullPath), content);
        await this.fileSystem.writeFile(pathInfo.fullPath, content);

        const newStat = await this.fileSystem.stat(pathInfo.fullPath);
        const savedSession = this.sessions.completeSave(id, content, savingSession.localRevision, newStat.mtimeMs);
        this.syncCache(savedSession);
        if (savedSession.content === savedSession.savedContent) {
          void this.recoveryDrafts.discard(id).catch(() => undefined);
        } else {
          this.recoveryDrafts.scheduleSnapshot(savedSession);
        }
        pathInfo.node.modifiedTime = newStat.mtime.toLocaleString();
        pathInfo.node.description = content.substring(0, MAX_FILE_DESCRIPTION_LENGTH);
      } catch (error) {
        if (this.sessions.get(id)?.status === 'conflict' || this.sessions.get(id)?.status === 'unavailable') {
          throw error;
        }
        const message = error instanceof Error ? error.message : '保存文件失败';
        const failedSession = this.sessions.failSave(id, message, savingSession.localRevision);
        this.syncCache(failedSession);
        await this.recoveryDrafts.save(failedSession, 'save-failure').catch(() => undefined);
        throw new Error('保存文件失败');
      } finally {
        this.writesInProgress.delete(nodePath.resolve(pathInfo.fullPath));
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
    this.scheduleSessionPersistence(nextSession);

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
    this.scheduleSessionPersistence(nextSession);
    return nextSession;
  }

  async getRecoveryDraft(id: string): Promise<RecoveryDraft | null> {
    await this.getSession({ id });
    return this.recoveryDrafts.get(id);
  }

  async recoverDraft(id: string): Promise<DocumentSession> {
    const currentSession = await this.getSession({ id });
    const draft = this.recoveryDrafts.get(id);
    if (!draft) {
      throw new Error('恢复草稿不存在');
    }

    const recoveredSession = this.sessions.updateContent(
      id,
      draft.content,
      Math.max(currentSession.localRevision + 1, draft.revision)
    );
    this.syncCache(recoveredSession);
    this.scheduleAutoSave(recoveredSession);
    return recoveredSession;
  }

  async discardRecoveryDraft(id: string, createdAt: number, revision: number): Promise<{ success: boolean }> {
    return { success: await this.recoveryDrafts.discard(id, { createdAt, revision }) };
  }

  async handleExternalChange(path: string): Promise<void> {
    const normalizedPath = nodePath.resolve(path);
    const affectedSessions = this.sessions.getAll().filter(item => {
      const sessionPath = nodePath.resolve(item.path);
      return sessionPath === normalizedPath || sessionPath.startsWith(`${normalizedPath}${nodePath.sep}`);
    });

    for (const session of affectedSessions) {
      await this.handleExternalSessionChange(session, nodePath.resolve(session.path));
    }
  }

  private async handleExternalSessionChange(session: DocumentSession, path: string): Promise<void> {
    if (!(await this.fileSystem.exists(path))) {
      const unavailable = this.sessions.markUnavailable(session.id);
      this.saveScheduler.cancel(session.id);
      this.syncCache(unavailable);
      this.recoveryDrafts.scheduleSnapshot(unavailable);
      this.emitExternalChange({ kind: 'deleted', session: unavailable });
      return;
    }

    const [diskContent, stat] = await Promise.all([
      this.fileSystem.readFile(path, { encoding: 'utf8' }),
      this.fileSystem.stat(path)
    ]);
    if (this.writesInProgress.get(path) === diskContent || diskContent === session.savedContent) {
      return;
    }

    if (session.content === session.savedContent) {
      const reloaded = this.sessions.applyExternalContent(session.id, diskContent, stat.mtimeMs);
      this.syncCache(reloaded);
      this.emitExternalChange({ kind: 'reloaded', session: reloaded });
      return;
    }

    const conflicted = this.sessions.markConflict(session.id, diskContent, stat.mtimeMs);
    this.saveScheduler.cancel(session.id);
    this.syncCache(conflicted);
    this.recoveryDrafts.scheduleSnapshot(conflicted);
    this.emitExternalChange({ kind: 'conflict', session: conflicted });
  }

  async resolveDocumentConflict(data: ResolveDocumentConflictRequest): Promise<ResolveDocumentConflictResponse> {
    const current = await this.getSession({ id: data.id });
    if (data.resolution === 'use-disk') {
      const session = this.sessions.resolveWithDisk(data.id);
      this.syncCache(session);
      void this.recoveryDrafts.discard(data.id).catch(() => undefined);
      return { session, libTree: this.libraryTreeStore.getTree() };
    }

    const expectedDisk = {
      content: current.diskContent,
      missing: current.status === 'unavailable'
    };
    const local = this.sessions.prepareLocalResolution(data.id);
    this.syncCache(local);
    let result = this.libraryTreeStore.getTree();
    await this.saveScheduler.enqueue(data.id, () =>
      this.persistDocument({ id: data.id, content: local.content, revision: local.localRevision }, expectedDisk).then(
        tree => {
          result = tree;
        }
      )
    );
    return { session: await this.getSession({ id: data.id }), libTree: result };
  }

  async saveDocumentCopy(data: SaveDocumentCopyRequest): Promise<SaveDocumentCopyResponse> {
    const current = await this.getSession({ id: data.id });
    if (data.revision < current.localRevision) {
      throw new Error('副本内容修订已过期');
    }
    const session =
      data.content === current.content ? current : this.sessions.updateContent(data.id, data.content, data.revision);
    this.syncCache(session);
    this.recoveryDrafts.scheduleSnapshot(session);

    let copyId = '';
    const libTree = await this.libraryTreeStore.updateTree(async tree => {
      const source = this.resolveFileNode(data.id, tree);
      if (!source.parent) {
        throw new Error('无法确定副本目录');
      }
      let suffix = 1;
      let name = `${source.node.name} (local copy)`;
      while (source.parent.children.some(child => child.type === 'file' && child.name === name)) {
        suffix += 1;
        name = `${source.node.name} (local copy ${suffix})`;
      }
      const copyPath = nodePath.join(nodePath.dirname(source.fullPath), `${name}.md`);
      await this.fileSystem.writeFile(copyPath, session.content);
      const stat = await this.fileSystem.stat(copyPath);
      copyId = createLibraryNodeId();
      source.parent.children.push({
        id: copyId,
        name,
        type: 'file',
        birthTime: stat.birthtime.toLocaleString(),
        modifiedTime: stat.mtime.toLocaleString(),
        description: session.content.substring(0, MAX_FILE_DESCRIPTION_LENGTH),
        children: []
      });
      await persistLibTree(tree, this.appPathStore.getRootDir(), this.fileSystem);
      return tree;
    });
    return { copyId, libTree };
  }

  refreshSessionPaths(libTree: RootLibraryTree): void {
    this.sessions.getAll().forEach(session => {
      try {
        this.sessions.updatePath(
          session.id,
          resolveLibraryNodePath(libTree, session.id, this.appPathStore.getRootDir()).fullPath
        );
      } catch {
        // 已从树中删除的会话由 LibraryService.removeDocument 负责清理。
      }
    });
  }

  removeDocument(id: string): void {
    this.saveScheduler.cancel(id);
    this.sessions.remove(id);
    this.cache.removeCache(id);
    void this.recoveryDrafts.discard(id).catch(() => undefined);
  }

  private persistCurrentSession(id: string): Promise<RootLibraryTree> {
    const session = this.sessions.get(id);
    if (session?.status === 'conflict' || session?.status === 'unavailable') {
      return Promise.reject(new Error('文档存在外部变更，保存已暂停'));
    }
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

  private scheduleSessionPersistence(session: DocumentSession): void {
    if (session.status === 'conflict' || session.status === 'unavailable') {
      this.saveScheduler.cancel(session.id);
      this.recoveryDrafts.scheduleSnapshot(session);
      return;
    }
    if (session.content === session.savedContent) {
      this.saveScheduler.cancel(session.id);
      void this.recoveryDrafts.discard(session.id).catch(() => undefined);
      return;
    }
    this.recoveryDrafts.scheduleSnapshot(session);
    this.scheduleAutoSave(session);
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
      isChange:
        session.content !== session.savedContent || session.status === 'conflict' || session.status === 'unavailable',
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

  private async assertDiskBaseline(
    session: DocumentSession,
    path: string,
    expectedDisk?: { content?: string; missing?: boolean }
  ): Promise<void> {
    const exists = await this.fileSystem.exists(path);
    if (!exists) {
      if (expectedDisk?.missing) {
        return;
      }
      const unavailable = this.sessions.markUnavailable(session.id);
      this.saveScheduler.cancel(session.id);
      this.syncCache(unavailable);
      this.recoveryDrafts.scheduleSnapshot(unavailable);
      this.emitExternalChange({ kind: 'deleted', session: unavailable });
      throw new Error('文件已被删除或移动，保存已暂停');
    }

    const diskContent = await this.fileSystem.readFile(path, { encoding: 'utf8' });
    const baseline = expectedDisk?.content ?? session.savedContent;
    if (diskContent === baseline) {
      return;
    }
    const stat = await this.fileSystem.stat(path);
    const conflicted = this.sessions.markConflict(session.id, diskContent, stat.mtimeMs);
    this.saveScheduler.cancel(session.id);
    this.syncCache(conflicted);
    this.recoveryDrafts.scheduleSnapshot(conflicted);
    this.emitExternalChange({ kind: 'conflict', session: conflicted });
    throw new Error('文件已被外部修改，保存已暂停');
  }

  private emitExternalChange(event: ExternalDocumentChangeEvent): void {
    this.windowRegistry.getCurrentWindow()?.webContents.send('next-ipc-client', {
      type: 'external-document-change',
      payload: event
    } as RendererListenerAction<ExternalDocumentChangeEvent>);
  }
}

export default DocumentService;
