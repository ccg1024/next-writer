import type { BrowserWindow } from 'electron';
import { LibraryTree, UpdateLibRequest } from '_types';

interface ILibraryService {
  synchronizeLibrary(win?: BrowserWindow): Promise<void>;
  updateLibrary(data: UpdateLibRequest): Promise<LibraryTree | Record<string, never>>;
}

export default ILibraryService;
