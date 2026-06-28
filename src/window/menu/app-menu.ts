import { inject, injectable } from 'inversify';
import { app, Menu, MenuItemConstructorOptions, MenuItem, BrowserWindow, KeyboardEvent } from 'electron';
import { RendererListenerAction } from '_types';
import IAppMenu from '../interface/app-menu';
import IMenuActionService from '../interface/menu-action-service';
import { TYPES } from '../types';

@injectable()
class AppMenu implements IAppMenu {
  private isMac: boolean;

  constructor(@inject(TYPES.IMenuActionService) private menuActions: IMenuActionService) {
    this.isMac = process.platform === 'darwin';

    this.synchronousLibrary = this.synchronousLibrary.bind(this);
    this.save = this.save.bind(this);
    this.toggleToc = this.toggleToc.bind(this);
    this.toggleTypewriterMode = this.toggleTypewriterMode.bind(this);
    this.toggleVisible = this.toggleVisible.bind(this);
  }

  getMenuTemplate(): MenuItemConstructorOptions[] {
    const appInfo: MenuItemConstructorOptions[] = this.isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about', label: '关于' },
              { type: 'separator' },
              { role: 'services', label: '服务' },
              { type: 'separator' },
              { label: '同步库', click: this.synchronousLibrary },
              { type: 'separator' },
              { role: 'quit', label: '关闭' }
            ]
          }
        ]
      : [];

    const file: MenuItemConstructorOptions = {
      label: '文件',
      submenu: [
        {
          label: '保存',
          // enabled: false,
          accelerator: this.isMac ? 'Cmd+s' : 'Ctrl+s',
          click: this.save
        }
      ]
    };

    const view: MenuItemConstructorOptions = {
      label: '视图',
      submenu: [
        { role: 'toggleDevTools', label: '调试' },
        { type: 'separator' },
        {
          label: '显示/隐藏库',
          accelerator: this.isMac ? 'Cmd+b' : 'Ctrl+b',
          click: delegateVisibleToggle('toggle-lib', this)
        },
        {
          label: '显示/隐藏详情',
          accelerator: this.isMac ? 'Cmd+Shift+b' : 'Ctrl+Shift+b',
          click: delegateVisibleToggle('toggle-lib-detail', this)
        },
        {
          label: '显示/隐藏操作菜单',
          accelerator: this.isMac ? 'Cmd+t' : 'Ctrl+t'
        },
        {
          label: '显示/隐藏标题导航',
          accelerator: this.isMac ? 'Cmd+h' : 'Ctrl+h',
          click: this.toggleToc
        }
      ]
    };

    const edit: MenuItemConstructorOptions = {
      label: '编辑',
      submenu: [
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { type: 'separator' },

        {
          label: '打字机模式',
          type: 'checkbox',
          click: this.toggleTypewriterMode
        },
        {
          label: '专注模式',
          type: 'checkbox'
        },
        { type: 'separator' },
        { label: '插入图片' }
      ]
    };

    return [
      ...appInfo,
      file,
      view,
      edit,
      {
        label: '窗口',
        submenu: [
          { role: 'minimize', label: '最小化' },
          { role: 'zoom', label: '最大化' }
        ]
      }
    ];
  }

  createMenu(): void {
    Menu.setApplicationMenu(Menu.buildFromTemplate(this.getMenuTemplate()));
  }

  private async synchronousLibrary(_m: MenuItem, win: BrowserWindow, _event: KeyboardEvent): Promise<void> {
    await this.menuActions.synchronizeLibrary(win);
  }

  private save(_m: MenuItem, win: BrowserWindow, _event: KeyboardEvent): void {
    this.menuActions.save(win);
  }

  private toggleToc(_m: MenuItem, win: BrowserWindow): void {
    this.menuActions.toggleToc(win);
  }

  private toggleTypewriterMode(_m: MenuItem, win: BrowserWindow): void {
    this.menuActions.toggleTypewriterMode(win);
  }

  toggleVisible(type: RendererListenerAction['type'], win: BrowserWindow): void {
    this.menuActions.toggleVisible(type, win);
  }
}

function delegateVisibleToggle(type: RendererListenerAction['type'], ctx: AppMenu) {
  return (_m: MenuItem, win: BrowserWindow) => {
    ctx.toggleVisible(type, win);
  };
}

export default AppMenu;
