export type AppLogPhase = 'start' | 'success' | 'failure';

export type AppLogMetadata = {
  documentId?: string;
  resultCount?: number;
  documentCount?: number;
  indexEntryCount?: number;
  changeKind?: string;
  ipcChannel?: string;
};

interface IAppLogger {
  record(
    event: string,
    phase: AppLogPhase,
    options?: { durationMs?: number; metadata?: AppLogMetadata; error?: unknown }
  ): void;
}

export default IAppLogger;
