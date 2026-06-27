import type { BrowserWindow } from 'electron';
import { RootLibraryTree, UpdateLibRequest } from '_types';

interface ILibraryService {
  synchronizeLibrary(win?: BrowserWindow): Promise<void>;
  updateLibrary(data: UpdateLibRequest): Promise<RootLibraryTree>;
}

export default ILibraryService;
