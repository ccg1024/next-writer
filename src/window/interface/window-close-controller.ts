import type { BrowserWindow } from 'electron';

interface IWindowCloseController {
  mount(win: BrowserWindow, onCleanup: () => void): void;
}

export default IWindowCloseController;
