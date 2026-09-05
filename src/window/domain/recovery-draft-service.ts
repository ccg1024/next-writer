import nodePath from 'path';
import { inject, injectable } from 'inversify';
import { RECOVERY_DRAFT_DIR_NAME, RECOVERY_DRAFT_RETENTION_MS, RECOVERY_DRAFT_SNAPSHOT_DELAY_MS } from 'src/config/env';
import { DocumentSession, RecoveryDraft, RecoveryDraftSource } from '_types';
import IAppPathStore from '../interface/app-path-store';
import IFileSystem from '../interface/file-system';
import IRecoveryDraftService from '../interface/recovery-draft-service';
import { TYPES } from '../types';
import IAppLogger from '../interface/app-logger';

const RECOVERY_DRAFT_VERSION = 1 as const;

@injectable()
/** 在应用配置目录中以原子替换方式保存未落盘内容，并缓存启动扫描得到的有效草稿。 */
class RecoveryDraftService implements IRecoveryDraftService {
  private readonly drafts = new Map<string, RecoveryDraft>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly writes = new Map<string, Promise<void>>();
  private initialized = false;

  constructor(
    @inject(TYPES.IFileSystem) private fileSystem: IFileSystem,
    @inject(TYPES.IAppPathStore) private appPathStore: IAppPathStore,
    @inject(TYPES.IAppLogger) private appLogger: IAppLogger = { record: () => undefined }
  ) {}

  async initialize(): Promise<void> {
    const draftDir = this.getDraftDir();
    await this.fileSystem.ensureDir(draftDir);
    const entries = await this.fileSystem.readDir(draftDir);
    const now = Date.now();

    await Promise.all(
      entries
        .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
        .map(async entry => {
          const draftPath = nodePath.join(draftDir, entry.name);
          try {
            const draft = parseRecoveryDraft(await this.fileSystem.readFile(draftPath, { encoding: 'utf8' }));
            if (now - draft.createdAt > RECOVERY_DRAFT_RETENTION_MS) {
              await this.fileSystem.removeFile(draftPath);
              return;
            }
            this.drafts.set(draft.documentId, draft);
          } catch {
            // 损坏或不完整草稿不进入恢复列表，也不能中断工作区启动。
          }
        })
    );
    this.initialized = true;
  }

  get(documentId: string): RecoveryDraft | null {
    return this.drafts.get(documentId) ?? null;
  }

  async save(session: DocumentSession, source: RecoveryDraftSource): Promise<RecoveryDraft> {
    const draft: RecoveryDraft = {
      version: RECOVERY_DRAFT_VERSION,
      documentId: session.id,
      originalPath: session.path,
      content: session.content,
      revision: session.localRevision,
      createdAt: Date.now(),
      source
    };
    const write = (this.writes.get(session.id) ?? Promise.resolve())
      .catch(() => undefined)
      .then(async () => {
        await this.ensureInitialized();
        await this.writeDraft(draft);
        this.drafts.set(session.id, draft);
      });
    this.writes.set(session.id, write);
    try {
      await write;
      this.appLogger.record('draft.create', 'success', {
        metadata: { documentId: session.id, changeKind: source }
      });
    } catch (error) {
      this.appLogger.record('draft.create', 'failure', {
        metadata: { documentId: session.id, changeKind: source },
        error
      });
      throw error;
    }
    if (this.writes.get(session.id) === write) {
      this.writes.delete(session.id);
    }
    return draft;
  }

  scheduleSnapshot(session: DocumentSession): void {
    const currentTimer = this.timers.get(session.id);
    if (currentTimer) {
      clearTimeout(currentTimer);
    }
    const timer = setTimeout(() => {
      this.timers.delete(session.id);
      void this.save(session, 'periodic-snapshot').catch(() => undefined);
    }, RECOVERY_DRAFT_SNAPSHOT_DELAY_MS);
    this.timers.set(session.id, timer);
  }

  async discard(documentId: string, expected?: Pick<RecoveryDraft, 'createdAt' | 'revision'>): Promise<boolean> {
    if (!expected) {
      const timer = this.timers.get(documentId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(documentId);
      }
    }
    let discarded = false;
    const remove = (this.writes.get(documentId) ?? Promise.resolve())
      .catch(() => undefined)
      .then(async () => {
        const current = this.drafts.get(documentId);
        if (
          expected &&
          (!current || current.createdAt !== expected.createdAt || current.revision !== expected.revision)
        ) {
          return;
        }
        this.drafts.delete(documentId);
        const draftPath = this.getDraftPath(documentId);
        if (await this.fileSystem.exists(draftPath)) {
          await this.fileSystem.removeFile(draftPath);
        }
        discarded = true;
      });
    this.writes.set(documentId, remove);
    await remove;
    if (this.writes.get(documentId) === remove) {
      this.writes.delete(documentId);
    }
    return discarded;
  }

  destroy(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.drafts.clear();
    this.initialized = false;
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private async writeDraft(draft: RecoveryDraft): Promise<void> {
    const draftPath = this.getDraftPath(draft.documentId);
    const temporaryPath = `${draftPath}.tmp`;
    await this.fileSystem.writeFile(temporaryPath, JSON.stringify(draft), { encoding: 'utf8' });
    await this.fileSystem.rename(temporaryPath, draftPath);
  }

  private getDraftDir(): string {
    return nodePath.join(this.appPathStore.getConfigDir(), RECOVERY_DRAFT_DIR_NAME);
  }

  private getDraftPath(documentId: string): string {
    return nodePath.join(this.getDraftDir(), `${encodeURIComponent(documentId)}.json`);
  }
}

export function parseRecoveryDraft(content: string): RecoveryDraft {
  const value: unknown = JSON.parse(content);
  if (
    typeof value !== 'object' ||
    value === null ||
    (value as RecoveryDraft).version !== RECOVERY_DRAFT_VERSION ||
    typeof (value as RecoveryDraft).documentId !== 'string' ||
    typeof (value as RecoveryDraft).originalPath !== 'string' ||
    typeof (value as RecoveryDraft).content !== 'string' ||
    !Number.isFinite((value as RecoveryDraft).revision) ||
    !Number.isFinite((value as RecoveryDraft).createdAt) ||
    !['periodic-snapshot', 'save-failure', 'close-timeout'].includes((value as RecoveryDraft).source)
  ) {
    throw new Error('Invalid recovery draft.');
  }
  return value as RecoveryDraft;
}

export default RecoveryDraftService;
