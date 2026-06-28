import { injectable } from 'inversify';
import type { MainProcessMenuStatus, RendererListenerAction } from '_types';
import IMenuStateStore from '../interface/menu-state-store';

const DEFAULT_MENU_STATUS: MainProcessMenuStatus = {
  librarySidebar: true,
  detailSidebar: true,
  tocSidebar: false,
  typewriterMode: false,
  actionSidebar: false
};

@injectable()
class MenuStateStore implements IMenuStateStore {
  private status: MainProcessMenuStatus;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.status = { ...DEFAULT_MENU_STATUS };
  }

  getStatus(): MainProcessMenuStatus {
    return { ...this.status };
  }

  toggle(
    type: Extract<
      RendererListenerAction['type'],
      'toggle-lib' | 'toggle-lib-detail' | 'toggle-toc' | 'toggle-typewriter-mode'
    >
  ): boolean {
    switch (type) {
      case 'toggle-lib':
        this.status = { ...this.status, librarySidebar: !this.status.librarySidebar };
        return this.status.librarySidebar;
      case 'toggle-lib-detail':
        this.status = { ...this.status, detailSidebar: !this.status.detailSidebar };
        return this.status.detailSidebar;
      case 'toggle-toc':
        this.status = { ...this.status, tocSidebar: !this.status.tocSidebar };
        return this.status.tocSidebar;
      case 'toggle-typewriter-mode':
        this.status = { ...this.status, typewriterMode: !this.status.typewriterMode };
        return this.status.typewriterMode;
    }
  }
}

export default MenuStateStore;
