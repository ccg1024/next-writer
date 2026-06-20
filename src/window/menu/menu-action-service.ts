import { BrowserWindow } from 'electron';
import { inject, injectable } from 'inversify';
import { RendererListenerAction } from '_types';
import ILibraryService from '../interface/library-service';
import IMenuActionService from '../interface/menu-action-service';
import IRuntimeConfigStore from '../interface/runtime-config-store';
import { TYPES } from '../types';

@injectable()
class MenuActionService implements IMenuActionService {
  constructor(
    @inject(TYPES.IRuntimeConfigStore) private store: IRuntimeConfigStore,
    @inject(TYPES.ILibraryService) private libraryService: ILibraryService
  ) {}

  save(win: BrowserWindow): void {
    win.webContents.send('next-ipc-client', { type: 'write-file' } as RendererListenerAction);
  }

  toggleToc(win: BrowserWindow): void {
    const menuStatus = this.store.getConfig('menuStatus') ?? {
      librarySidebar: false,
      detailSidebar: false,
      tocSidebar: false,
      actionSidebar: false
    };

    menuStatus.tocSidebar = !menuStatus.tocSidebar;
    this.store.setConfig('menuStatus', menuStatus);
    win.webContents.send('next-ipc-client', {
      type: 'toggle-toc',
      payload: menuStatus.tocSidebar
    } as RendererListenerAction<boolean>);
  }

  toggleVisible(type: RendererListenerAction['type'], win: BrowserWindow): void {
    const menuStatus = this.store.getConfig('menuStatus') ?? {
      librarySidebar: true,
      detailSidebar: true,
      tocSidebar: false,
      actionSidebar: false
    };

    let payload: boolean | null = null;
    switch (type) {
      case 'toggle-lib':
        menuStatus.librarySidebar = !menuStatus.librarySidebar;
        payload = menuStatus.librarySidebar;
        break;
      case 'toggle-lib-detail':
        menuStatus.detailSidebar = !menuStatus.detailSidebar;
        payload = menuStatus.detailSidebar;
        break;
    }

    this.store.setConfig('menuStatus', menuStatus);

    if (payload !== null) {
      win.webContents.send('next-ipc-client', { type, payload } as RendererListenerAction<boolean>);
    }
  }

  async synchronizeLibrary(win: BrowserWindow): Promise<void> {
    await this.libraryService.synchronizeLibrary(win);
  }
}

export default MenuActionService;
