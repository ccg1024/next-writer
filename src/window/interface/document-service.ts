import {
  DocumentSession,
  GetDocumentSessionRequest,
  ReadFileRequest,
  ReadFileResponse,
  RecoveryDraft,
  RootLibraryTree,
  UpdateCacheRequest,
  UpdateDocumentSessionRequest,
  WriteFileRequest
} from '_types';

interface IDocumentService {
  readFile(data: ReadFileRequest): Promise<ReadFileResponse>;
  writeFile(data: WriteFileRequest): Promise<RootLibraryTree>;
  flushDocument(id: string): Promise<{ session: DocumentSession; libTree: RootLibraryTree }>;
  flushAll(timeoutMs: number): Promise<boolean>;
  updateCache(data: UpdateCacheRequest): Promise<{ success: boolean }>;
  getSession(data: GetDocumentSessionRequest): Promise<DocumentSession>;
  updateSession(data: UpdateDocumentSessionRequest): Promise<DocumentSession>;
  getRecoveryDraft(id: string): Promise<RecoveryDraft | null>;
  recoverDraft(id: string): Promise<DocumentSession>;
  discardRecoveryDraft(id: string, createdAt: number, revision: number): Promise<{ success: boolean }>;
  removeDocument(id: string): void;
}

export default IDocumentService;
