import type { BrowserWindow } from 'electron';

interface IWindowCloseService {
  hasUnsavedChanges(): boolean;
  shouldCloseWindow(win: BrowserWindow): Promise<boolean>;
}

export default IWindowCloseService;
