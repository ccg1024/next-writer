import {
  DocumentSession,
  GetDocumentSessionRequest,
  ReadFileRequest,
  ReadFileResponse,
  RootLibraryTree,
  UpdateCacheRequest,
  UpdateDocumentSessionRequest,
  WriteFileRequest
} from '_types';

interface IDocumentService {
  readFile(data: ReadFileRequest): Promise<ReadFileResponse>;
  writeFile(data: WriteFileRequest): Promise<RootLibraryTree>;
  updateCache(data: UpdateCacheRequest): Promise<{ success: boolean }>;
  getSession(data: GetDocumentSessionRequest): Promise<DocumentSession>;
  updateSession(data: UpdateDocumentSessionRequest): Promise<DocumentSession>;
}

export default IDocumentService;
