/// <reference types="jest" />

import type { DocumentSession } from '_types';
import {
  blocksDocumentPersistence,
  getExternalChangePresentation,
  shouldApplyOrdinarySession,
  shouldScheduleAutoSave
} from './document-external-change';

function createSession(status: DocumentSession['status']): DocumentSession {
  return {
    id: 'note-id',
    path: '/library/note.md',
    content: 'local',
    savedContent: 'disk',
    status,
    localRevision: 2,
    savedRevision: 1
  };
}

describe('document external change helpers', () => {
  it.each(['external-change', 'conflict', 'unavailable'] as const)('blocks persistence while status is %s', status => {
    expect(blocksDocumentPersistence(status)).toBe(true);
    expect(shouldScheduleAutoSave(createSession(status), true)).toBe(false);
  });

  it('allows automatic persistence for an ordinary dirty session', () => {
    expect(blocksDocumentPersistence('dirty')).toBe(false);
    expect(shouldScheduleAutoSave(createSession('dirty'), true)).toBe(true);
    expect(shouldScheduleAutoSave(createSession('dirty'), false)).toBe(false);
  });

  it('ignores ordinary session responses while a conflict is unresolved', () => {
    const conflicts = new Set(['note-id']);

    expect(shouldApplyOrdinarySession('note-id', createSession('dirty'), conflicts)).toBe(false);
    expect(shouldApplyOrdinarySession('other-id', createSession('dirty'), new Set())).toBe(false);
    expect(shouldApplyOrdinarySession('note-id', createSession('dirty'), new Set())).toBe(true);
  });

  it('offers restoring or copying local content when the source file was deleted', () => {
    expect(getExternalChangePresentation('deleted', 'unavailable')).toEqual({
      message: '文件已被外部删除，本地编辑内容仍然保留。',
      canUseDisk: false,
      canKeepLocal: true,
      canSaveCopy: true
    });
  });

  it('offers all conflict resolution actions for an externally modified file', () => {
    expect(getExternalChangePresentation('conflict', 'conflict')).toEqual({
      message: '文件已在外部发生变化，请选择要保留的版本。',
      canUseDisk: true,
      canKeepLocal: true,
      canSaveCopy: true
    });
    expect(getExternalChangePresentation('reloaded', 'saved')).toBeNull();
  });
});
