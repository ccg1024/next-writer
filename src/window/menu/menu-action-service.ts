import { BrowserWindow } from 'electron';
import { inject, injectable } from 'inversify';
import { RendererListenerAction } from '_types';
import ILibraryService from '../interface/library-service';
import IMenuActionService from '../interface/menu-action-service';
import IMenuStateStore from '../interface/menu-state-store';
import { TYPES } from '../types';

@injectable()
class MenuActionService implements IMenuActionService {
  constructor(
    @inject(TYPES.IMenuStateStore) private menuStateStore: IMenuStateStore,
    @inject(TYPES.ILibraryService) private libraryService: ILibraryService
  ) {}

  save(win: BrowserWindow): void {
    win.webContents.send('next-ipc-client', { type: 'write-file' } as RendererListenerAction);
  }

  toggleToc(win: BrowserWindow): void {
    const tocSidebar = this.menuStateStore.toggle('toggle-toc');
    win.webContents.send('next-ipc-client', {
      type: 'toggle-toc',
      payload: tocSidebar
    } as RendererListenerAction<boolean>);
  }

  toggleTypewriterMode(win: BrowserWindow): void {
    const typewriterMode = this.menuStateStore.toggle('toggle-typewriter-mode');
    win.webContents.send('next-ipc-client', {
      type: 'toggle-typewriter-mode',
      payload: typewriterMode
    } as RendererListenerAction<boolean>);
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
    await this.libraryService.synchronizeLibrary(win);
  }
}

export default MenuActionService;
