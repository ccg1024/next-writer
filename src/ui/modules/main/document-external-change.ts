import type { DocumentSession, DocumentSessionStatus } from '_types';

export type ExternalDocumentChangeKind = 'reloaded' | 'conflict' | 'deleted';

export type ExternalChangePresentation = {
  message: string;
  canUseDisk: boolean;
  canKeepLocal: boolean;
  canSaveCopy: boolean;
};

export function blocksDocumentPersistence(status?: DocumentSessionStatus): boolean {
  return status === 'external-change' || status === 'conflict' || status === 'unavailable';
}

export function shouldScheduleAutoSave(session: DocumentSession | null, enabled: boolean): boolean {
  return Boolean(enabled && session && !blocksDocumentPersistence(session.status));
}

export function shouldApplyOrdinarySession(
  activeDocumentId: string | undefined,
  incoming: DocumentSession,
  unresolvedConflictIds: ReadonlySet<string>
): boolean {
  return activeDocumentId === incoming.id && !unresolvedConflictIds.has(incoming.id);
}

export function getExternalChangePresentation(
  kind: ExternalDocumentChangeKind,
  status: DocumentSessionStatus
): ExternalChangePresentation | null {
  if (kind === 'reloaded') {
    return null;
  }

  if (kind === 'deleted') {
    return {
      message: '文件已被外部删除，本地编辑内容仍然保留。',
      canUseDisk: false,
      canKeepLocal: true,
      canSaveCopy: true
    };
  }

  if (kind === 'conflict' && status === 'conflict') {
    return {
      message: '文件已在外部发生变化，请选择要保留的版本。',
      canUseDisk: true,
      canKeepLocal: true,
      canSaveCopy: true
    };
  }

  return null;
}
