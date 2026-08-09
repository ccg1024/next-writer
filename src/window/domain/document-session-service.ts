import { DocumentSession, DocumentSessionStatus } from '_types';
import { injectable } from 'inversify';
import IDocumentSessionService from '../interface/document-session-service';

const VALID_TRANSITIONS: Record<DocumentSessionStatus, DocumentSessionStatus[]> = {
  loading: ['ready'],
  ready: ['dirty', 'saving'],
  dirty: ['dirty', 'saving', 'saved', 'save-error'],
  saving: ['saved', 'dirty', 'save-error'],
  saved: ['dirty', 'saving'],
  'save-error': ['dirty', 'saving', 'saved'],
  'external-change': ['dirty', 'conflict'],
  conflict: ['dirty', 'saving']
};

/** 校验并执行文档状态机迁移，阻止保存流程进入不可能的状态。 */
export function transitionDocumentSession(session: DocumentSession, status: DocumentSessionStatus): DocumentSession {
  if (session.status === status) {
    return session;
  }

  if (!VALID_TRANSITIONS[session.status].includes(status)) {
    throw new Error(`Invalid document session transition: ${session.status} -> ${status}`);
  }

  return { ...session, status };
}

@injectable()
/**
 * 内存中的文档会话仓库，以单调递增修订号管理编辑、保存及失败状态。
 * 服务返回新对象，调用方可以可靠地按引用或修订号判断状态是否更新。
 */
class DocumentSessionService implements IDocumentSessionService {
  private readonly sessions = new Map<string, DocumentSession>();

  get(id: string): DocumentSession | null {
    return this.sessions.get(id) ?? null;
  }

  getAll(): DocumentSession[] {
    return Array.from(this.sessions.values());
  }

  load(id: string, path: string, content: string, diskModifiedTime?: number): DocumentSession {
    const existing = this.sessions.get(id);
    if (existing) {
      return existing;
    }

    const session: DocumentSession = {
      id,
      path,
      content,
      savedContent: content,
      status: 'ready',
      localRevision: 0,
      savedRevision: 0,
      diskModifiedTime
    };
    this.sessions.set(id, session);
    return session;
  }

  updatePath(id: string, path: string): DocumentSession {
    const session = this.require(id);
    if (session.path === path) {
      return session;
    }

    const next = { ...session, path };
    this.sessions.set(id, next);
    return next;
  }

  updateContent(id: string, content: string, revision?: number): DocumentSession {
    const session = this.require(id);
    if (content === session.content) {
      return session;
    }

    const nextRevision = this.nextRevision(session.localRevision, revision);
    const nextStatus = content === session.savedContent ? 'saved' : 'dirty';
    const next = transitionDocumentSession({ ...session, content, localRevision: nextRevision }, nextStatus);
    this.sessions.set(id, next);
    return next;
  }

  beginSave(id: string, revision?: number): DocumentSession {
    const session = this.require(id);
    const nextRevision =
      typeof revision === 'number' && Number.isFinite(revision)
        ? Math.max(session.localRevision, revision)
        : session.localRevision;
    const next = transitionDocumentSession({ ...session, localRevision: nextRevision }, 'saving');
    this.sessions.set(id, next);
    return next;
  }

  completeSave(id: string, content: string, revision: number, diskModifiedTime?: number): DocumentSession {
    const session = this.require(id);
    if (revision < session.localRevision) {
      // 保存期间又发生了编辑：仅更新已落盘快照，保留较新的本地内容和未完成状态。
      const next: DocumentSession = {
        ...session,
        savedContent: content,
        savedRevision: Math.max(session.savedRevision, revision),
        diskModifiedTime,
        lastSavedAt: Date.now(),
        lastError: undefined,
        status: session.status === 'saving' ? 'saving' : session.content === content ? 'saved' : 'dirty'
      };
      this.sessions.set(id, next);
      return next;
    }

    const next: DocumentSession = {
      ...session,
      content,
      savedContent: content,
      savedRevision: revision,
      localRevision: revision,
      diskModifiedTime,
      lastSavedAt: Date.now(),
      lastError: undefined,
      status: 'saved'
    };
    this.sessions.set(id, next);
    return next;
  }

  failSave(id: string, error: string, revision: number): DocumentSession {
    const session = this.require(id);
    if (revision < session.localRevision) {
      // 旧保存请求失败不能把较新的编辑错误地标记为该修订的最终失败。
      const nextStatus = session.status === 'saving' ? 'saving' : 'save-error';
      const next = transitionDocumentSession({ ...session, lastError: error }, nextStatus);
      this.sessions.set(id, next);
      return next;
    }

    const next = transitionDocumentSession({ ...session, localRevision: revision, lastError: error }, 'save-error');
    this.sessions.set(id, next);
    return next;
  }

  remove(id: string): void {
    this.sessions.delete(id);
  }

  destroy(): void {
    this.sessions.clear();
  }

  private require(id: string): DocumentSession {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`Document session not found: ${id}`);
    }
    return session;
  }

  private nextRevision(current: number, requested?: number): number {
    return typeof requested === 'number' && Number.isFinite(requested) ? Math.max(current + 1, requested) : current + 1;
  }
}

export default DocumentSessionService;
