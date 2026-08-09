import type { BrowserWindow } from 'electron';

interface IWindowCloseService {
  hasUnsavedChanges(): boolean;
  flushPendingChanges(): Promise<boolean>;
  shouldCloseWindow(win: BrowserWindow): Promise<boolean>;
}

export default IWindowCloseService;
