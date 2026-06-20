import type { MenuItemConstructorOptions } from 'electron';

/**
 * Creates and installs the application menu.
 */
interface IAppMenu {
  getMenuTemplate(): MenuItemConstructorOptions[];
  createMenu(): void;
}

export default IAppMenu;
