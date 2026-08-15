/// <reference types="jest" />

import 'reflect-metadata';
import type { BrowserWindow } from 'electron';
import IAppMenu from '../interface/app-menu';
import IDocumentCacheService from '../interface/document-cache-service';
import IDocumentSessionService from '../interface/document-session-service';
import IMainWindowFactory from '../interface/main-window-factory';
import IMenuStateStore from '../interface/menu-state-store';
import IRecoveryDraftService from '../interface/recovery-draft-service';
import IWindowCloseController from '../interface/window-close-controller';
import IWindowRegistry from '../interface/window-registry';
import IWorkspaceService from '../interface/workspace-service';
import IWorkspaceFileWatcher from '../interface/workspace-file-watcher';
import IAppPathStore from '../interface/app-path-store';
import IDocumentService from '../interface/document-service';
import WindowSessionCoordinator from './window-session-coordinator';

describe('WindowSessionCoordinator', () => {
  let cache: jest.Mocked<Pick<IDocumentCacheService, 'init' | 'destroy'>>;
  let documentSessions: jest.Mocked<Pick<IDocumentSessionService, 'destroy'>>;
  let menuStateStore: jest.Mocked<Pick<IMenuStateStore, 'reset'>>;
  let menu: jest.Mocked<Pick<IAppMenu, 'createMenu'>>;
  let recoveryDrafts: jest.Mocked<Pick<IRecoveryDraftService, 'initialize' | 'destroy'>>;
  let windowFactory: jest.Mocked<IMainWindowFactory>;
  let windowCloseController: jest.Mocked<IWindowCloseController>;
  let windowRegistry: jest.Mocked<Pick<IWindowRegistry, 'setCurrentWindow' | 'clearCurrentWindow'>>;
  let workspaceService: jest.Mocked<IWorkspaceService>;
  let workspaceFileWatcher: jest.Mocked<IWorkspaceFileWatcher>;
  let coordinator: WindowSessionCoordinator;
  let cleanup: () => void;
  let win: BrowserWindow & {
    isDestroyed: jest.Mock;
    loadURL: jest.Mock;
    removeAllListeners: jest.Mock;
  };

  beforeEach(() => {
    (global as typeof globalThis & { MAIN_WINDOW_WEBPACK_ENTRY: string }).MAIN_WINDOW_WEBPACK_ENTRY =
      'app://index.html';
    cache = {
      init: jest.fn(),
      destroy: jest.fn()
    };
    documentSessions = {
      destroy: jest.fn()
    };
    menuStateStore = {
      reset: jest.fn()
    };
    menu = {
      createMenu: jest.fn()
    };
    win = {
      isDestroyed: jest.fn().mockReturnValue(false),
      loadURL: jest.fn(),
      removeAllListeners: jest.fn(),
      webContents: {
        openDevTools: jest.fn()
      }
    } as unknown as typeof win;
    windowFactory = {
      create: jest.fn().mockReturnValue(win)
    };
    windowCloseController = {
      mount: jest.fn((_win: BrowserWindow, onCleanup: () => void) => {
        cleanup = onCleanup;
      })
    };
    windowRegistry = {
      setCurrentWindow: jest.fn(),
      clearCurrentWindow: jest.fn()
    };
    workspaceService = {
      initWorkspace: jest.fn().mockResolvedValue(undefined)
    };
    recoveryDrafts = {
      initialize: jest.fn().mockResolvedValue(undefined),
      destroy: jest.fn()
    };
    workspaceFileWatcher = { start: jest.fn(), stop: jest.fn() };
    coordinator = new WindowSessionCoordinator(
      cache as unknown as IDocumentCacheService,
      menuStateStore as unknown as IMenuStateStore,
      menu as unknown as IAppMenu,
      windowFactory,
      windowCloseController,
      windowRegistry as unknown as IWindowRegistry,
      workspaceService,
      documentSessions as unknown as IDocumentSessionService,
      recoveryDrafts as unknown as IRecoveryDraftService,
      workspaceFileWatcher,
      { getRootDir: jest.fn().mockReturnValue('/workspace') } as unknown as IAppPathStore,
      { handleExternalChange: jest.fn().mockResolvedValue(undefined) } as unknown as IDocumentService
    );
  });

  it('creates and initializes the main window session', async () => {
    await coordinator.createWindow();

    expect(windowFactory.create).toHaveBeenCalled();
    expect(windowRegistry.setCurrentWindow).toHaveBeenCalledWith(win);
    expect(cache.init).toHaveBeenCalled();
    expect(workspaceService.initWorkspace).toHaveBeenCalled();
    expect(recoveryDrafts.initialize).toHaveBeenCalled();
    expect(menu.createMenu).toHaveBeenCalled();
    expect(menuStateStore.reset).toHaveBeenCalled();
    expect(windowCloseController.mount).toHaveBeenCalledWith(win, expect.any(Function));
    expect(win.loadURL).toHaveBeenCalled();
    expect(workspaceFileWatcher.start).toHaveBeenCalledWith('/workspace', expect.any(Function));
  });

  it('cleans up the current window session', async () => {
    await coordinator.createWindow();

    cleanup();

    expect(cache.destroy).toHaveBeenCalled();
    expect(documentSessions.destroy).toHaveBeenCalled();
    expect(recoveryDrafts.destroy).toHaveBeenCalled();
    expect(workspaceFileWatcher.stop).toHaveBeenCalled();
    expect(windowRegistry.clearCurrentWindow).toHaveBeenCalledWith(win);
  });

  it('removes listeners from an existing live window before replacing it', async () => {
    await coordinator.createWindow();
    await coordinator.createWindow();

    expect(win.removeAllListeners).toHaveBeenCalled();
    expect(windowFactory.create).toHaveBeenCalledTimes(2);
  });
});
