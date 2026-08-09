import { inject, injectable } from 'inversify';
import { MAX_FILE_DESCRIPTION_LENGTH } from 'src/config/env';
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
import { isLibraryTreeNode, persistLibTree, resolveLibraryNodePath } from '../utils/lib-tree-utils';
import { TYPES } from '../types';

@injectable()
class DocumentService implements IDocumentService {
  constructor(
    @inject(TYPES.IFileSystem) private fileSystem: IFileSystem,
    @inject(TYPES.IAppPathStore) private appPathStore: IAppPathStore,
    @inject(TYPES.ILibraryTreeStore) private libraryTreeStore: ILibraryTreeStore,
    @inject(TYPES.IDocumentCacheService) private cache: IDocumentCacheService,
    @inject(TYPES.IDocumentSessionService) private sessions: IDocumentSessionService
  ) {}

  async readFile(data: ReadFileRequest): Promise<ReadFileResponse> {
    const { id } = data ?? {};
    const pathInfo = this.resolveFileNode(id);
    const session = await this.ensureSession(id, pathInfo.fullPath);

    return { content: session.content };
  }

  async writeFile(data: WriteFileRequest): Promise<RootLibraryTree> {
    const { id, content, revision } = data ?? {};
    const rootDir = this.appPathStore.getRootDir();

    return this.libraryTreeStore.updateTree(async libTree => {
      const pathInfo = this.resolveFileNode(id, libTree);
      const session = await this.ensureSession(id, pathInfo.fullPath);
      const requestedRevision = revision === undefined ? undefined : this.normalizeRevision(revision);
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
    return nextSession;
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
