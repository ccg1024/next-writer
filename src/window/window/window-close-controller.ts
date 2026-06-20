import type { BrowserWindow } from 'electron';
import { inject, injectable } from 'inversify';
import IWindowCloseController from '../interface/window-close-controller';
import IWindowCloseService from '../interface/window-close-service';
import { TYPES } from '../types';

@injectable()
class WindowCloseController implements IWindowCloseController {
  constructor(@inject(TYPES.IWindowCloseService) private windowCloseService: IWindowCloseService) {}

  mount(win: BrowserWindow, onCleanup: () => void): void {
    win.on('close', async event => {
      if (!this.windowCloseService.hasUnsavedChanges()) {
        win.removeAllListeners();
        onCleanup();
        return;
      }

      event.preventDefault();
      const shouldClose = await this.windowCloseService.shouldCloseWindow(win);

      if (!shouldClose) {
        return;
      }

      win.removeAllListeners();
      win.close();
      onCleanup();
    });
  }
}

export default WindowCloseController;
