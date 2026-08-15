import type { BrowserWindow } from 'electron';
import { inject, injectable } from 'inversify';
import { IS_DEV } from 'src/config/env';
import IAppMenu from '../interface/app-menu';
import IAppPathStore from '../interface/app-path-store';
import IDocumentCacheService from '../interface/document-cache-service';
import IDocumentService from '../interface/document-service';
import IDocumentSessionService from '../interface/document-session-service';
import IMenuStateStore from '../interface/menu-state-store';
import IRecoveryDraftService from '../interface/recovery-draft-service';
import IMainWindowFactory from '../interface/main-window-factory';
import IWindowCloseController from '../interface/window-close-controller';
import IWindowRegistry from '../interface/window-registry';
import IWindowSessionCoordinator from '../interface/window-session-coordinator';
import IWorkspaceService from '../interface/workspace-service';
import IWorkspaceFileWatcher from '../interface/workspace-file-watcher';
import { TYPES } from '../types';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

@injectable()
/**
 * 管理单个主窗口会话：创建窗口前初始化工作区与菜单，关闭后释放跨窗口缓存和文档会话。
 */
class WindowSessionCoordinator implements IWindowSessionCoordinator {
  private win: BrowserWindow | null = null;

  constructor(
    @inject(TYPES.IDocumentCacheService) private cache: IDocumentCacheService,
    @inject(TYPES.IMenuStateStore) private menuStateStore: IMenuStateStore,
    @inject(TYPES.IAppMenu) private menu: IAppMenu,
    @inject(TYPES.IMainWindowFactory) private windowFactory: IMainWindowFactory,
    @inject(TYPES.IWindowCloseController) private windowCloseController: IWindowCloseController,
    @inject(TYPES.IWindowRegistry) private windowRegistry: IWindowRegistry,
    @inject(TYPES.IWorkspaceService) private workspaceService: IWorkspaceService,
    @inject(TYPES.IDocumentSessionService) private documentSessions: IDocumentSessionService,
    @inject(TYPES.IRecoveryDraftService) private recoveryDrafts: IRecoveryDraftService,
    @inject(TYPES.IWorkspaceFileWatcher) private workspaceFileWatcher: IWorkspaceFileWatcher,
    @inject(TYPES.IAppPathStore) private appPathStore: IAppPathStore,
    @inject(TYPES.IDocumentService) private documentService: IDocumentService
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
    await this.recoveryDrafts.initialize();
    this.menu.createMenu();
    this.menuStateStore.reset();

    if (IS_DEV) {
      this.win.webContents.openDevTools();
    }

    this.windowCloseController.mount(this.win, () => this.destroy());
    await this.win.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
    this.workspaceFileWatcher.start(this.appPathStore.getRootDir(), change => {
      void this.documentService.handleExternalChange(change.path).catch(() => undefined);
    });
  }

  destroy(): void {
    this.workspaceFileWatcher.stop();
    this.cache.destroy();
    this.documentSessions.destroy();
    this.recoveryDrafts.destroy();
    this.windowRegistry.clearCurrentWindow(this.win);
    this.win = null;
  }
}

export default WindowSessionCoordinator;
