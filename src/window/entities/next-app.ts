import { BrowserWindow } from 'electron';
import { inject, injectable } from 'inversify';
import { IS_DEV } from 'src/config/env';
import INextApp from '../interface/next-app';
import INextCacheSystem from '../interface/next-cache-system';
import INextMenu from '../interface/next-menu';
import INextStoreSystem from '../interface/next-store-system';
import IMainWindowFactory from '../interface/main-window-factory';
import IWindowCloseService from '../interface/window-close-service';
import IWindowRegistry from '../interface/window-registry';
import IWorkspaceService from '../interface/workspace-service';
import { TYPES } from '../types';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

@injectable()
class NextApp implements INextApp {
  private win: BrowserWindow | null = null;

  constructor(
    @inject(TYPES.INextCacheSystem) private cache: INextCacheSystem,
    @inject(TYPES.INextStoreSystem) private store: INextStoreSystem,
    @inject(TYPES.INextMenu) private menu: INextMenu,
    @inject(TYPES.IMainWindowFactory) private windowFactory: IMainWindowFactory,
    @inject(TYPES.IWindowCloseService) private windowCloseService: IWindowCloseService,
    @inject(TYPES.IWindowRegistry) private windowRegistry: IWindowRegistry,
    @inject(TYPES.IWorkspaceService) private workspaceService: IWorkspaceService
  ) {
    this.createWindow = this.createWindow.bind(this);
  }

  async createWindow(): Promise<void> {
    if (this.win && !this.win.isDestroyed()) {
      this.win.removeAllListeners();
    }

    this.win = this.windowFactory.create();
    this.windowRegistry.setCurrentWindow(this.win);
    this.cache.init();
    await this.workspaceService.initWorkspace();
    this.menu.createMenu();
    this.store.setConfig('menuStatus', {
      librarySidebar: true,
      detailSidebar: true,
      tocSidebar: false,
      actionSidebar: false
    });

    if (IS_DEV) {
      this.win.webContents.openDevTools();
    }

    this.mountInstanceEvent(this.win);
    await this.win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  }

  destroy(): void {
    this.cache.destroy();
    this.windowRegistry.clearCurrentWindow(this.win);
    this.win = null;
  }

  private mountInstanceEvent(win: BrowserWindow): void {
    win.on('close', async e => {
      if (!this.windowCloseService.hasUnsavedChanges()) {
        win.removeAllListeners();
        this.destroy();
        return;
      }

      e.preventDefault();
      const shouldClose = await this.windowCloseService.shouldCloseWindow(win);

      if (!shouldClose) {
        return;
      }

      win.removeAllListeners();
      win.close();
      this.destroy();
    });
  }
}

export default NextApp;
