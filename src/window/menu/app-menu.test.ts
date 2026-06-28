/// <reference types="jest" />

import 'reflect-metadata';
import type { BrowserWindow, MenuItemConstructorOptions } from 'electron';
import { Menu } from 'electron';
import IMenuActionService from '../interface/menu-action-service';
import AppMenu from './app-menu';

jest.mock('electron', () => ({
  app: {
    name: 'next-writer'
  },
  Menu: {
    buildFromTemplate: jest.fn().mockReturnValue({ id: 'built-menu' }),
    setApplicationMenu: jest.fn()
  }
}));

describe('AppMenu', () => {
  const originalPlatform = process.platform;
  let menuActions: jest.Mocked<IMenuActionService>;
  let appMenu: AppMenu;
  let win: BrowserWindow;

  beforeAll(() => {
    Object.defineProperty(process, 'platform', {
      configurable: true,
      value: 'darwin'
    });
  });

  afterAll(() => {
    Object.defineProperty(process, 'platform', {
      configurable: true,
      value: originalPlatform
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    menuActions = {
      save: jest.fn(),
      toggleToc: jest.fn(),
      toggleTypewriterMode: jest.fn(),
      toggleVisible: jest.fn(),
      synchronizeLibrary: jest.fn().mockResolvedValue(undefined)
    };
    appMenu = new AppMenu(menuActions);
    win = {} as BrowserWindow;
  });

  it('installs the built application menu', () => {
    appMenu.createMenu();

    expect(Menu.buildFromTemplate).toHaveBeenCalledWith(expect.any(Array));
    expect(Menu.setApplicationMenu).toHaveBeenCalledWith({ id: 'built-menu' });
  });

  it('delegates save menu clicks to menu actions', () => {
    clickMenuItem(appMenu.getMenuTemplate(), '文件', '保存', win);

    expect(menuActions.save).toHaveBeenCalledWith(win);
  });

  it('delegates library synchronization clicks to menu actions', async () => {
    await clickMenuItem(appMenu.getMenuTemplate(), 'next-writer', '同步库', win);

    expect(menuActions.synchronizeLibrary).toHaveBeenCalledWith(win);
  });

  it('delegates sidebar visibility clicks to menu actions', () => {
    const template = appMenu.getMenuTemplate();

    clickMenuItem(template, '视图', '显示/隐藏库', win);
    clickMenuItem(template, '视图', '显示/隐藏详情', win);
    clickMenuItem(template, '视图', '显示/隐藏标题导航', win);

    expect(menuActions.toggleVisible).toHaveBeenCalledWith('toggle-lib', win);
    expect(menuActions.toggleVisible).toHaveBeenCalledWith('toggle-lib-detail', win);
    expect(menuActions.toggleToc).toHaveBeenCalledWith(win);
  });

  it('delegates typewriter mode clicks to menu actions', () => {
    clickMenuItem(appMenu.getMenuTemplate(), '编辑', '打字机模式', win);

    expect(menuActions.toggleTypewriterMode).toHaveBeenCalledWith(win);
  });
});

function clickMenuItem(
  template: MenuItemConstructorOptions[],
  menuLabel: string,
  itemLabel: string,
  win: BrowserWindow
): ReturnType<NonNullable<MenuItemConstructorOptions['click']>> {
  const menu = template.find(item => item.label === menuLabel);
  const submenu = menu?.submenu as MenuItemConstructorOptions[] | undefined;
  const menuItem = submenu?.find(item => item.label === itemLabel);

  if (!menuItem?.click) {
    throw new Error(`Menu item not found: ${menuLabel} > ${itemLabel}`);
  }

  return menuItem.click({} as Electron.MenuItem, win, {} as Electron.KeyboardEvent);
}
