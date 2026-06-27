import { ReadFileRequest, ReadFileResponse, RootLibraryTree, UpdateCacheRequest, WriteFileRequest } from '_types';

interface IDocumentService {
  readFile(data: ReadFileRequest): Promise<ReadFileResponse>;
  writeFile(data: WriteFileRequest): Promise<RootLibraryTree>;
  updateCache(data: UpdateCacheRequest): Promise<{ success: boolean }>;
}

export default IDocumentService;
