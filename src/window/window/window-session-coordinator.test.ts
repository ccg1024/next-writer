/// <reference types="jest" />

import 'reflect-metadata';
import type { BrowserWindow } from 'electron';
import IAppMenu from '../interface/app-menu';
import IDocumentCacheService from '../interface/document-cache-service';
import IMainWindowFactory from '../interface/main-window-factory';
import IRuntimeConfigStore from '../interface/runtime-config-store';
import IWindowCloseController from '../interface/window-close-controller';
import IWindowRegistry from '../interface/window-registry';
import IWorkspaceService from '../interface/workspace-service';
import WindowSessionCoordinator from './window-session-coordinator';

describe('WindowSessionCoordinator', () => {
  let cache: jest.Mocked<Pick<IDocumentCacheService, 'init' | 'destroy'>>;
  let store: jest.Mocked<Pick<IRuntimeConfigStore, 'setConfig'>>;
  let menu: jest.Mocked<Pick<IAppMenu, 'createMenu'>>;
  let windowFactory: jest.Mocked<IMainWindowFactory>;
  let windowCloseController: jest.Mocked<IWindowCloseController>;
  let windowRegistry: jest.Mocked<Pick<IWindowRegistry, 'setCurrentWindow' | 'clearCurrentWindow'>>;
  let workspaceService: jest.Mocked<IWorkspaceService>;
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
    store = {
      setConfig: jest.fn()
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
    coordinator = new WindowSessionCoordinator(
      cache as unknown as IDocumentCacheService,
      store as unknown as IRuntimeConfigStore,
      menu as unknown as IAppMenu,
      windowFactory,
      windowCloseController,
      windowRegistry as unknown as IWindowRegistry,
      workspaceService
    );
  });

  it('creates and initializes the main window session', async () => {
    await coordinator.createWindow();

    expect(windowFactory.create).toHaveBeenCalled();
    expect(windowRegistry.setCurrentWindow).toHaveBeenCalledWith(win);
    expect(cache.init).toHaveBeenCalled();
    expect(workspaceService.initWorkspace).toHaveBeenCalled();
    expect(menu.createMenu).toHaveBeenCalled();
    expect(store.setConfig).toHaveBeenCalledWith('menuStatus', {
      librarySidebar: true,
      detailSidebar: true,
      tocSidebar: false,
      actionSidebar: false
    });
    expect(windowCloseController.mount).toHaveBeenCalledWith(win, expect.any(Function));
    expect(win.loadURL).toHaveBeenCalled();
  });

  it('cleans up the current window session', async () => {
    await coordinator.createWindow();

    cleanup();

    expect(cache.destroy).toHaveBeenCalled();
    expect(windowRegistry.clearCurrentWindow).toHaveBeenCalledWith(win);
  });

  it('removes listeners from an existing live window before replacing it', async () => {
    await coordinator.createWindow();
    await coordinator.createWindow();

    expect(win.removeAllListeners).toHaveBeenCalled();
    expect(windowFactory.create).toHaveBeenCalledTimes(2);
  });
});
