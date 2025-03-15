import { app, MenuItemConstructorOptions } from 'electron';

/**
 * A factory class which to generate a application's menu
 *
 * @author crazycodegame
 *
 */
export default class NextWriterMenu {
  /**
   * Create menu
   */
  createMenus(): MenuItemConstructorOptions[] {
    const isMac = process.platform === 'darwin';
    const appInfo: MenuItemConstructorOptions[] = isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about', label: '关于' },
              { type: 'separator' },
              { role: 'services', label: '服务' },
              { type: 'separator' },
              {
                label: '同步库'
              },
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
          enabled: false,
          accelerator: isMac ? 'Cmd+s' : 'Ctrl+s'
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
          accelerator: isMac ? 'Cmd+Shift+s' : 'Ctrl+Shift+s'
        },
        {
          label: '显示/隐藏详情',
          accelerator: isMac ? 'Cmd+Shift+d' : 'Ctrl+Shift+d'
        },
        {
          label: '显示/隐藏操作菜单',
          accelerator: isMac ? 'Cmd+Shift+t' : 'Ctrl+Shift+t'
        },
        {
          label: '显示/隐藏标题导航',
          accelerator: isMac ? 'Cmd+Shift+h' : 'Ctrl+Shift+h'
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
          type: 'checkbox'
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
}
