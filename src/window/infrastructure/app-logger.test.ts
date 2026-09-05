/// <reference types="jest" />

import 'reflect-metadata';
import nodeFs from 'fs';
import nodeOs from 'os';
import nodePath from 'path';
import { LOG_NAME } from 'src/config/env';
import AppPathStore from '../state/app-path-store';
import AppLogger, { APP_LOG_MAX_BYTES } from './app-logger';

describe('AppLogger', () => {
  let directory: string;
  let logger: AppLogger;

  beforeEach(async () => {
    directory = await nodeFs.promises.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'next-writer-log-'));
    const paths = new AppPathStore();
    paths.setPaths({ logDir: directory });
    logger = new AppLogger(paths);
  });

  afterEach(async () => {
    await nodeFs.promises.rm(directory, { recursive: true, force: true });
  });

  it('writes serial JSONL with only privacy-safe metadata', async () => {
    logger.record('document.save', 'start', {
      metadata: { documentId: 'doc-1', resultCount: 2, query: 'secret', path: '/private/note.md' } as never
    });
    logger.record('document.save', 'failure', { error: new Error('failed at /private/note.md') });
    await logger.flush();

    const lines = (await nodeFs.promises.readFile(nodePath.join(directory, LOG_NAME), 'utf8')).trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toMatchObject({
      event: 'document.save',
      phase: 'start',
      metadata: { documentId: 'doc-1' },
      error: null
    });
    expect(lines.join('')).not.toContain('secret');
    expect(lines.join('')).not.toContain('/private/note.md');
    expect(JSON.parse(lines[1]).error).toContain('[path]');
  });

  it('rotates one backup at five MiB', async () => {
    const logPath = nodePath.join(directory, LOG_NAME);
    await nodeFs.promises.writeFile(logPath, Buffer.alloc(APP_LOG_MAX_BYTES, 'x'));
    logger.record('workspace.search', 'success', { metadata: { resultCount: 1 } });
    await logger.flush();

    await expect(nodeFs.promises.stat(`${logPath}.1`)).resolves.toMatchObject({ size: APP_LOG_MAX_BYTES });
    expect(JSON.parse((await nodeFs.promises.readFile(logPath, 'utf8')).trim()).event).toBe('workspace.search');
  });

  it('isolates write failures from callers and later records', async () => {
    const paths = new AppPathStore();
    paths.setPaths({ logDir: nodePath.join(directory, 'blocked') });
    await nodeFs.promises.writeFile(paths.getLogDir(), 'not a directory');
    const blockedLogger = new AppLogger(paths);
    expect(() => blockedLogger.record('document.save', 'start')).not.toThrow();
    await expect(blockedLogger.flush()).resolves.toBeUndefined();
  });
});
