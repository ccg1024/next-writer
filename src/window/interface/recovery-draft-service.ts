import { DocumentSession, RecoveryDraft, RecoveryDraftSource } from '_types';

interface IRecoveryDraftService {
  initialize(): Promise<void>;
  get(documentId: string): RecoveryDraft | null;
  save(session: DocumentSession, source: RecoveryDraftSource): Promise<RecoveryDraft>;
  scheduleSnapshot(session: DocumentSession): void;
  discard(documentId: string, expected?: Pick<RecoveryDraft, 'createdAt' | 'revision'>): Promise<boolean>;
  destroy(): void;
}

export default IRecoveryDraftService;
