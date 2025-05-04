import type { MenuItemConstructorOptions } from 'electron';

/**
 * Next Writer menu interface, whice to create a application menu system
 */
interface INextMenu {
  getMenuTemplate(): MenuItemConstructorOptions[];
  createMenu(): void;
}

export default INextMenu;
