/// <reference types="jest" />

import 'reflect-metadata';
import nodeFs from 'fs';
import nodeOs from 'os';
import nodePath from 'path';
import { RECOVERY_DRAFT_DIR_NAME, RECOVERY_DRAFT_RETENTION_MS } from 'src/config/env';
import { DocumentSession } from '_types';
import FileSystem from '../infrastructure/file-system';
import AppPathStore from '../state/app-path-store';
import RecoveryDraftService from './recovery-draft-service';

describe('RecoveryDraftService', () => {
  let configDir: string;
  let service: RecoveryDraftService;

  beforeEach(async () => {
    configDir = await nodeFs.promises.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'next-writer-recovery-'));
    const appPathStore = new AppPathStore();
    appPathStore.setPaths({ configDir });
    service = new RecoveryDraftService(new FileSystem(), appPathStore);
    await service.initialize();
  });

  afterEach(async () => {
    service.destroy();
    await nodeFs.promises.rm(configDir, { recursive: true, force: true });
  });

  it('atomically persists and reloads a versioned draft', async () => {
    const draft = await service.save(createSession(), 'save-failure');
    const draftDir = nodePath.join(configDir, RECOVERY_DRAFT_DIR_NAME);

    expect(draft).toMatchObject({ version: 1, documentId: 'note-id', source: 'save-failure' });
    await expect(nodeFs.promises.stat(nodePath.join(draftDir, 'note-id.json'))).resolves.toBeDefined();
    await expect(nodeFs.promises.stat(nodePath.join(draftDir, 'note-id.json.tmp'))).rejects.toThrow();

    service.destroy();
    const appPathStore = new AppPathStore();
    appPathStore.setPaths({ configDir });
    service = new RecoveryDraftService(new FileSystem(), appPathStore);
    await service.initialize();

    expect(service.get('note-id')).toEqual(draft);
  });

  it('ignores corrupt drafts without blocking initialization', async () => {
    const draftDir = nodePath.join(configDir, RECOVERY_DRAFT_DIR_NAME);
    await nodeFs.promises.writeFile(nodePath.join(draftDir, 'broken.json'), '{broken');

    await expect(service.initialize()).resolves.toBeUndefined();
    expect(service.get('broken')).toBeNull();
  });

  it('removes expired drafts during startup scan', async () => {
    const draftDir = nodePath.join(configDir, RECOVERY_DRAFT_DIR_NAME);
    const draftPath = nodePath.join(draftDir, 'expired.json');
    await nodeFs.promises.writeFile(
      draftPath,
      JSON.stringify({
        version: 1,
        documentId: 'expired',
        originalPath: '/workspace/expired.md',
        content: 'old draft',
        revision: 1,
        createdAt: Date.now() - RECOVERY_DRAFT_RETENTION_MS - 1,
        source: 'periodic-snapshot'
      })
    );

    await service.initialize();

    expect(service.get('expired')).toBeNull();
    await expect(nodeFs.promises.stat(draftPath)).rejects.toThrow();
  });

  it('discards a draft without touching its original document', async () => {
    const originalPath = nodePath.join(configDir, 'note.md');
    await nodeFs.promises.writeFile(originalPath, 'disk content');
    await service.save(createSession(originalPath), 'periodic-snapshot');

    await expect(service.discard('note-id')).resolves.toBe(true);

    expect(service.get('note-id')).toBeNull();
    await expect(nodeFs.promises.readFile(originalPath, 'utf8')).resolves.toBe('disk content');
  });

  it('does not discard a newer draft through an older prompt', async () => {
    const older = await service.save(createSession(), 'periodic-snapshot');
    const newer = await service.save({ ...createSession(), content: 'newer', localRevision: 3 }, 'save-failure');

    await expect(service.discard('note-id', { createdAt: older.createdAt, revision: older.revision })).resolves.toBe(
      false
    );

    expect(service.get('note-id')).toEqual(newer);
  });

  it('debounces periodic snapshots and keeps the latest session content', async () => {
    jest.useFakeTimers();
    const save = jest.spyOn(service, 'save');
    try {
      service.scheduleSnapshot(createSession());
      service.scheduleSnapshot({ ...createSession(), content: 'latest draft', localRevision: 3 });

      await jest.advanceTimersByTimeAsync(1000);

      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith(expect.objectContaining({ content: 'latest draft' }), 'periodic-snapshot');
      await save.mock.results[0].value;
    } finally {
      jest.useRealTimers();
    }
  });

  function createSession(originalPath = '/workspace/note.md'): DocumentSession {
    return {
      id: 'note-id',
      path: originalPath,
      content: 'unsaved draft',
      savedContent: 'disk content',
      status: 'dirty',
      localRevision: 2,
      savedRevision: 1
    };
  }
});
