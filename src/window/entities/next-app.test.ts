/// <reference types="jest" />

import 'reflect-metadata';
import type { BrowserWindow } from 'electron';
import INextCacheSystem from '../interface/next-cache-system';
import IMainWindowFactory from '../interface/main-window-factory';
import INextMenu from '../interface/next-menu';
import INextStoreSystem from '../interface/next-store-system';
import IWindowCloseService from '../interface/window-close-service';
import IWindowRegistry from '../interface/window-registry';
import IWorkspaceService from '../interface/workspace-service';
import NextApp from './next-app';

type CloseHandler = (event: { preventDefault: jest.Mock }) => Promise<void>;

describe('NextApp close lifecycle', () => {
  let cache: jest.Mocked<Pick<INextCacheSystem, 'init' | 'destroy'>>;
  let store: jest.Mocked<Pick<INextStoreSystem, 'setConfig'>>;
  let menu: jest.Mocked<Pick<INextMenu, 'createMenu'>>;
  let windowFactory: jest.Mocked<IMainWindowFactory>;
  let windowCloseService: jest.Mocked<IWindowCloseService>;
  let windowRegistry: jest.Mocked<Pick<IWindowRegistry, 'setCurrentWindow' | 'clearCurrentWindow'>>;
  let workspaceService: jest.Mocked<IWorkspaceService>;
  let app: NextApp;
  let closeHandler: CloseHandler;
  let win: BrowserWindow & {
    close: jest.Mock;
    on: jest.Mock;
    removeAllListeners: jest.Mock;
  };

  beforeEach(() => {
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
      close: jest.fn(),
      isDestroyed: jest.fn().mockReturnValue(false),
      loadURL: jest.fn(),
      on: jest.fn((_event: string, handler: CloseHandler) => {
        closeHandler = handler;
      }),
      removeAllListeners: jest.fn(),
      webContents: {
        openDevTools: jest.fn()
      }
    } as unknown as typeof win;
    windowFactory = {
      create: jest.fn().mockReturnValue(win)
    };
    windowCloseService = {
      hasUnsavedChanges: jest.fn(),
      shouldCloseWindow: jest.fn()
    };
    windowRegistry = {
      setCurrentWindow: jest.fn(),
      clearCurrentWindow: jest.fn()
    };
    workspaceService = {
      initWorkspace: jest.fn().mockResolvedValue(undefined)
    };
    app = new NextApp(
      cache as unknown as INextCacheSystem,
      store as unknown as INextStoreSystem,
      menu as unknown as INextMenu,
      windowFactory,
      windowCloseService,
      windowRegistry as unknown as IWindowRegistry,
      workspaceService
    );

    (app as unknown as { win: BrowserWindow | null }).win = win;
    (app as unknown as { mountInstanceEvent(win: BrowserWindow): void }).mountInstanceEvent(win);
  });

  it('prevents close and keeps state when unsaved changes are cancelled', async () => {
    const event = { preventDefault: jest.fn() };
    windowCloseService.hasUnsavedChanges.mockReturnValue(true);
    windowCloseService.shouldCloseWindow.mockResolvedValue(false);

    await closeHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(win.close).not.toHaveBeenCalled();
    expect(cache.destroy).not.toHaveBeenCalled();
    expect(windowRegistry.clearCurrentWindow).not.toHaveBeenCalled();
  });

  it('prevents the original close event and closes explicitly after confirmation', async () => {
    const event = { preventDefault: jest.fn() };
    windowCloseService.hasUnsavedChanges.mockReturnValue(true);
    windowCloseService.shouldCloseWindow.mockResolvedValue(true);

    await closeHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(win.removeAllListeners).toHaveBeenCalled();
    expect(win.close).toHaveBeenCalled();
    expect(cache.destroy).toHaveBeenCalled();
    expect(windowRegistry.clearCurrentWindow).toHaveBeenCalledWith(win);
  });

  it('cleans up without blocking the close event when there are no unsaved changes', async () => {
    const event = { preventDefault: jest.fn() };
    windowCloseService.hasUnsavedChanges.mockReturnValue(false);

    await closeHandler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(windowCloseService.shouldCloseWindow).not.toHaveBeenCalled();
    expect(win.close).not.toHaveBeenCalled();
    expect(cache.destroy).toHaveBeenCalled();
    expect(windowRegistry.clearCurrentWindow).toHaveBeenCalledWith(win);
  });
});
