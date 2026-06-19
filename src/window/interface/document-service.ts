import { ReadFileRequest, ReadFileResponse, UpdateCacheRequest, WriteFileRequest } from '_types';

interface IDocumentService {
  readFile(data: ReadFileRequest): Promise<ReadFileResponse>;
  writeFile(data: WriteFileRequest): Promise<void>;
  updateCache(data: UpdateCacheRequest): Promise<{ success: boolean }>;
}

export default IDocumentService;
