/// <reference types="jest" />

import 'reflect-metadata';
import type { BrowserWindow } from 'electron';
import { dialog } from 'electron';
import INextCacheSystem from '../interface/next-cache-system';
import WindowCloseService from './window-close-service';

jest.mock('electron', () => ({
  dialog: {
    showMessageBox: jest.fn()
  }
}));

describe('WindowCloseService', () => {
  let cache: jest.Mocked<Pick<INextCacheSystem, 'hasModifed'>>;
  let service: WindowCloseService;
  let win: BrowserWindow;

  beforeEach(() => {
    cache = {
      hasModifed: jest.fn()
    };
    service = new WindowCloseService(cache as unknown as INextCacheSystem);
    win = {} as BrowserWindow;
    jest.clearAllMocks();
  });

  it('allows closing without prompting when there are no unsaved changes', async () => {
    cache.hasModifed.mockReturnValue(false);

    await expect(service.shouldCloseWindow(win)).resolves.toBe(true);

    expect(dialog.showMessageBox).not.toHaveBeenCalled();
  });

  it('blocks closing when the user cancels the unsaved-change prompt', async () => {
    cache.hasModifed.mockReturnValue(true);
    (dialog.showMessageBox as jest.Mock).mockResolvedValueOnce({ response: 0 });

    await expect(service.shouldCloseWindow(win)).resolves.toBe(false);

    expect(dialog.showMessageBox).toHaveBeenCalledWith(win, {
      type: 'warning',
      buttons: ['取消', '确认'],
      defaultId: 1,
      message: '[next-writer] 有文件未保存，是否关闭应用？',
      title: '通知'
    });
  });

  it('allows closing when the user confirms the unsaved-change prompt', async () => {
    cache.hasModifed.mockReturnValue(true);
    (dialog.showMessageBox as jest.Mock).mockResolvedValueOnce({ response: 1 });

    await expect(service.shouldCloseWindow(win)).resolves.toBe(true);
  });
});
