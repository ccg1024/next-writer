import { BrowserWindow, dialog } from 'electron';
import { inject, injectable } from 'inversify';
import { WINDOW_CLOSE_FLUSH_TIMEOUT_MS } from 'src/config/env';
import IDocumentCacheService from '../interface/document-cache-service';
import IDocumentService from '../interface/document-service';
import IWindowCloseService from '../interface/window-close-service';
import { TYPES } from '../types';

@injectable()
class WindowCloseService implements IWindowCloseService {
  constructor(
    @inject(TYPES.IDocumentCacheService) private cache: IDocumentCacheService,
    @inject(TYPES.IDocumentService) private documentService: IDocumentService
  ) {}

  hasUnsavedChanges(): boolean {
    return this.cache.hasModified();
  }

  flushPendingChanges(): Promise<boolean> {
    return this.documentService.flushAll(WINDOW_CLOSE_FLUSH_TIMEOUT_MS);
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
