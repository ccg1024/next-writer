import type { BrowserWindow } from 'electron';
import { inject, injectable } from 'inversify';
import IWindowCloseController from '../interface/window-close-controller';
import IWindowCloseService from '../interface/window-close-service';
import { TYPES } from '../types';

@injectable()
/** 将窗口 close 事件接入未保存检查，并确保确认关闭后只执行一次资源清理。 */
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
      if (await this.windowCloseService.flushPendingChanges()) {
        win.removeAllListeners();
        win.close();
        onCleanup();
        return;
      }
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
