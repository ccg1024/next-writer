import { BrowserWindow } from 'electron';
import { inject, injectable } from 'inversify';
import { RendererListenerAction } from '_types';
import IMenuActionService from '../interface/menu-action-service';
import IMenuStateStore from '../interface/menu-state-store';
import { TYPES } from '../types';

@injectable()
/** 将原生菜单动作转换为领域调用或发送给渲染进程的类型化命令。 */
class MenuActionService implements IMenuActionService {
  constructor(@inject(TYPES.IMenuStateStore) private menuStateStore: IMenuStateStore) {}

  save(win: BrowserWindow): void {
    this.executeCommand(win, 'document.save');
  }

  openCommandPalette(win: BrowserWindow): void {
    this.executeCommand(win, 'command.palette.open');
  }

  searchWorkspace(win: BrowserWindow): void {
    this.executeCommand(win, 'workspace.search.open');
  }

  openDocumentShortcuts(win: BrowserWindow): void {
    win.webContents.send('next-ipc-client', { type: 'open-document-shortcuts' } as RendererListenerAction);
  }

  toggleToc(win: BrowserWindow): void {
    const tocSidebar = this.menuStateStore.toggle('toggle-toc');
    win.webContents.send('next-ipc-client', {
      type: 'toggle-toc',
      payload: tocSidebar
    } as RendererListenerAction<boolean>);
  }

  toggleTypewriterMode(win: BrowserWindow): void {
    this.executeCommand(win, 'runtime.typewriter.toggle');
  }

  toggleVisible(type: RendererListenerAction['type'], win: BrowserWindow): void {
    let payload: boolean | null = null;
    switch (type) {
      case 'toggle-lib':
        payload = this.menuStateStore.toggle(type);
        break;
      case 'toggle-lib-detail':
        payload = this.menuStateStore.toggle(type);
        break;
    }

    if (payload !== null) {
      win.webContents.send('next-ipc-client', { type, payload } as RendererListenerAction<boolean>);
    }
  }

  async synchronizeLibrary(win: BrowserWindow): Promise<void> {
    this.executeCommand(win, 'workspace.synchronize');
  }

  private executeCommand(win: BrowserWindow, id: string): void {
    win.webContents.send('next-ipc-client', { type: 'execute-command', payload: { id } } as RendererListenerAction<{
      id: string;
    }>);
  }
}

export default MenuActionService;
