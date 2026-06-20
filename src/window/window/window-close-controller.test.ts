/// <reference types="jest" />

import 'reflect-metadata';
import type { BrowserWindow } from 'electron';
import IWindowCloseService from '../interface/window-close-service';
import WindowCloseController from './window-close-controller';

type CloseHandler = (event: { preventDefault: jest.Mock }) => Promise<void>;

describe('WindowCloseController', () => {
  let closeService: jest.Mocked<IWindowCloseService>;
  let controller: WindowCloseController;
  let closeHandler: CloseHandler;
  let onCleanup: jest.Mock;
  let win: BrowserWindow & {
    close: jest.Mock;
    on: jest.Mock;
    removeAllListeners: jest.Mock;
  };

  beforeEach(() => {
    closeService = {
      hasUnsavedChanges: jest.fn(),
      shouldCloseWindow: jest.fn()
    };
    win = {
      close: jest.fn(),
      on: jest.fn((_event: string, handler: CloseHandler) => {
        closeHandler = handler;
      }),
      removeAllListeners: jest.fn()
    } as unknown as typeof win;
    onCleanup = jest.fn();
    controller = new WindowCloseController(closeService);
    controller.mount(win, onCleanup);
  });

  it('cleans up without blocking the close event when there are no unsaved changes', async () => {
    const event = { preventDefault: jest.fn() };
    closeService.hasUnsavedChanges.mockReturnValue(false);

    await closeHandler(event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(closeService.shouldCloseWindow).not.toHaveBeenCalled();
    expect(win.removeAllListeners).toHaveBeenCalled();
    expect(win.close).not.toHaveBeenCalled();
    expect(onCleanup).toHaveBeenCalled();
  });

  it('prevents close and keeps state when unsaved changes are cancelled', async () => {
    const event = { preventDefault: jest.fn() };
    closeService.hasUnsavedChanges.mockReturnValue(true);
    closeService.shouldCloseWindow.mockResolvedValue(false);

    await closeHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(win.close).not.toHaveBeenCalled();
    expect(onCleanup).not.toHaveBeenCalled();
  });

  it('prevents the original close event and closes explicitly after confirmation', async () => {
    const event = { preventDefault: jest.fn() };
    closeService.hasUnsavedChanges.mockReturnValue(true);
    closeService.shouldCloseWindow.mockResolvedValue(true);

    await closeHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(win.removeAllListeners).toHaveBeenCalled();
    expect(win.close).toHaveBeenCalled();
    expect(onCleanup).toHaveBeenCalled();
  });
});
