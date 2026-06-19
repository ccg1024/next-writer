import { BrowserWindow, BrowserWindowConstructorOptions, shell } from 'electron';
import { injectable } from 'inversify';
import IMainWindowFactory from '../interface/main-window-factory';

declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const DEFAULT_WINDOW: BrowserWindowConstructorOptions = {
  height: 725,
  width: 1180,
  minWidth: 1000,
  minHeight: 400,
  frame: false,
  titleBarStyle: 'hidden',
  trafficLightPosition: { x: 28, y: 15 },
  vibrancy: 'under-window',
  visualEffectState: 'active',
  webPreferences: {
    preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true
  }
};

@injectable()
class MainWindowFactory implements IMainWindowFactory {
  create(): BrowserWindow {
    const win = new BrowserWindow(DEFAULT_WINDOW);
    this.mountWindowGuards(win);
    return win;
  }

  private mountWindowGuards(win: BrowserWindow): void {
    win.webContents.on('will-navigate', event => {
      event.preventDefault();
    });

    win.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//.test(url)) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    win.webContents.on('will-attach-webview', event => {
      event.preventDefault();
    });
  }
}

export default MainWindowFactory;
