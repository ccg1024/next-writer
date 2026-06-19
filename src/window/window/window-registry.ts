import { BrowserWindow } from 'electron';
import { injectable } from 'inversify';
import IWindowRegistry from '../interface/window-registry';

@injectable()
class WindowRegistry implements IWindowRegistry {
  private currentWindow: BrowserWindow | null = null;

  setCurrentWindow(win: BrowserWindow): void {
    this.currentWindow = win;
  }

  getCurrentWindow(): BrowserWindow | null {
    return this.currentWindow && !this.currentWindow.isDestroyed() ? this.currentWindow : null;
  }

  clearCurrentWindow(win?: BrowserWindow): void {
    if (!win || Object.is(this.currentWindow, win)) {
      this.currentWindow = null;
    }
  }
}

export default WindowRegistry;
