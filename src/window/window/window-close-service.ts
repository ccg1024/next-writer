import { BrowserWindow, dialog } from 'electron';
import { inject, injectable } from 'inversify';
import INextCacheSystem from '../interface/next-cache-system';
import IWindowCloseService from '../interface/window-close-service';
import { TYPES } from '../types';

@injectable()
class WindowCloseService implements IWindowCloseService {
  constructor(@inject(TYPES.INextCacheSystem) private cache: INextCacheSystem) {}

  hasUnsavedChanges(): boolean {
    return this.cache.hasModifed();
  }

  async shouldCloseWindow(win: BrowserWindow): Promise<boolean> {
    if (!this.hasUnsavedChanges()) {
      return true;
    }

    const result = await dialog.showMessageBox(win, {
      type: 'warning',
      buttons: ['取消', '确认'],
      defaultId: 1,
      message: '[next-writer] 有文件未保存，是否关闭应用？',
      title: '通知'
    });

    return result.response !== 0;
  }
}

export default WindowCloseService;
