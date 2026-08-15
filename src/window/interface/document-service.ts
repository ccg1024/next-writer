import {
  DocumentSession,
  GetDocumentSessionRequest,
  ReadFileRequest,
  ReadFileResponse,
  RecoveryDraft,
  ResolveDocumentConflictRequest,
  ResolveDocumentConflictResponse,
  RootLibraryTree,
  SaveDocumentCopyRequest,
  SaveDocumentCopyResponse,
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
  handleExternalChange(path: string): Promise<void>;
  resolveDocumentConflict(data: ResolveDocumentConflictRequest): Promise<ResolveDocumentConflictResponse>;
  saveDocumentCopy(data: SaveDocumentCopyRequest): Promise<SaveDocumentCopyResponse>;
  refreshSessionPaths(libTree: RootLibraryTree): void;
  removeDocument(id: string): void;
}

export default IDocumentService;
