import type { BrowserWindow } from 'electron';

interface IWindowRegistry {
  setCurrentWindow(win: BrowserWindow): void;
  getCurrentWindow(): BrowserWindow | null;
  clearCurrentWindow(win?: BrowserWindow): void;
}

export default IWindowRegistry;
