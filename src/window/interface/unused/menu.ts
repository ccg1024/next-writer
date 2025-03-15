import type { MenuItemConstructorOptions } from 'electron';

/**
 * A interface which to genenrate a application's menu
 *
 * @author crazycodegame
 */
interface INextWriterMenu {
  createMenus(): MenuItemConstructorOptions[];
}

export default INextWriterMenu;
