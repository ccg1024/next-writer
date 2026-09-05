import nodeFs from 'fs';
import nodePath from 'path';
import { inject, injectable } from 'inversify';
import { LOG_NAME } from 'src/config/env';
import IAppPathStore from '../interface/app-path-store';
import IAppLogger, { AppLogMetadata, AppLogPhase } from '../interface/app-logger';
import { TYPES } from '../types';

export const APP_LOG_MAX_BYTES = 5 * 1024 * 1024;

@injectable()
/** 仅接受非正文白名单元数据的 JSONL 应用日志，失败永不传播到业务调用方。 */
class AppLogger implements IAppLogger {
  private queue: Promise<void> = Promise.resolve();

  constructor(@inject(TYPES.IAppPathStore) private appPathStore: IAppPathStore) {}

  record(
    event: string,
    phase: AppLogPhase,
    options: { durationMs?: number; metadata?: AppLogMetadata; error?: unknown } = {}
  ): void {
    const entry = {
      timestamp: new Date().toISOString(),
      event: normalizeEventName(event),
      phase,
      durationMs: normalizeDuration(options.durationMs),
      metadata: sanitizeMetadata(options.metadata),
      error: options.error === undefined ? null : normalizeError(options.error)
    };
    this.queue = this.queue.then(() => this.append(`${JSON.stringify(entry)}\n`)).catch(() => undefined);
  }

  flush(): Promise<void> {
    return this.queue;
  }

  private async append(line: string): Promise<void> {
    const logDir = this.appPathStore.getLogDir();
    if (!logDir) return;
    const logPath = nodePath.join(logDir, LOG_NAME);
    await nodeFs.promises.mkdir(logDir, { recursive: true });
    try {
      const stat = await nodeFs.promises.stat(logPath);
      if (stat.size + Buffer.byteLength(line) >= APP_LOG_MAX_BYTES) {
        const backupPath = `${logPath}.1`;
        await nodeFs.promises.rm(backupPath, { force: true });
        await nodeFs.promises.rename(logPath, backupPath);
      }
    } catch (error) {
      if (!isMissingFile(error)) throw error;
    }
    await nodeFs.promises.appendFile(logPath, line, 'utf8');
  }
}

const METADATA_KEYS = new Set<keyof AppLogMetadata>([
  'documentId',
  'resultCount',
  'documentCount',
  'indexEntryCount',
  'changeKind',
  'ipcChannel'
]);

function sanitizeMetadata(metadata?: AppLogMetadata): AppLogMetadata {
  if (!metadata) return {};
  return Object.keys(metadata).reduce<AppLogMetadata>((result, key) => {
    if (METADATA_KEYS.has(key as keyof AppLogMetadata)) {
      const value = metadata[key as keyof AppLogMetadata];
      if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) {
        Object.assign(result, { [key]: value });
      }
    }
    return result;
  }, {});
}

function normalizeEventName(event: string): string {
  return /^[a-z][a-z0-9.-]{0,79}$/.test(event) ? event : 'invalid-event-name';
}

function normalizeDuration(value?: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
}

function normalizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Unknown error';
  return message.replace(/(?:[A-Za-z]:)?[/\\][^\s]+/g, '[path]').slice(0, 500);
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'code' in error && (error as { code?: string }).code === 'ENOENT'
  );
}

export default AppLogger;
