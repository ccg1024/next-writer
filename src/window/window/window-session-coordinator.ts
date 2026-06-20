import type { BrowserWindow } from 'electron';
import { inject, injectable } from 'inversify';
import { IS_DEV } from 'src/config/env';
import INextCacheSystem from '../interface/next-cache-system';
import INextMenu from '../interface/next-menu';
import INextStoreSystem from '../interface/next-store-system';
import IMainWindowFactory from '../interface/main-window-factory';
import IWindowCloseController from '../interface/window-close-controller';
import IWindowRegistry from '../interface/window-registry';
import IWindowSessionCoordinator from '../interface/window-session-coordinator';
import IWorkspaceService from '../interface/workspace-service';
import { TYPES } from '../types';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

@injectable()
class WindowSessionCoordinator implements IWindowSessionCoordinator {
  private win: BrowserWindow | null = null;

  constructor(
    @inject(TYPES.INextCacheSystem) private cache: INextCacheSystem,
    @inject(TYPES.INextStoreSystem) private store: INextStoreSystem,
    @inject(TYPES.INextMenu) private menu: INextMenu,
    @inject(TYPES.IMainWindowFactory) private windowFactory: IMainWindowFactory,
    @inject(TYPES.IWindowCloseController) private windowCloseController: IWindowCloseController,
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

    this.windowCloseController.mount(this.win, () => this.destroy());
    await this.win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  }

  destroy(): void {
    this.cache.destroy();
    this.windowRegistry.clearCurrentWindow(this.win);
    this.win = null;
  }
}

export default WindowSessionCoordinator;
