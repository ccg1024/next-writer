import type { BrowserWindow } from 'electron';

interface IMainWindowFactory {
  create(): BrowserWindow;
}

export default IMainWindowFactory;
