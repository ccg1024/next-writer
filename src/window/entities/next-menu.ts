import { inject, injectable } from 'inversify';
import { app, Menu, MenuItemConstructorOptions, MenuItem, BrowserWindow, KeyboardEvent } from 'electron';
import INextMenu from '../interface/next-menu';
import INextStoreSystem from '../interface/next-store-system';
import { isTrulyEmpty } from 'src/tools/utils';
import nodeFs from 'fs';
import nodePath from 'path';
import { TYPES } from '../types';
import { LibraryTree, RootLibraryTree } from '_types';
import { MAX_FILE_DESCRIPTION_LENGTH, ROOT_CONFIG_NAME } from 'bin/index.es';
import INextFileSystem from '../interface/next-file-system';

@injectable()
class NextMenu implements INextMenu {
  private isMac: boolean;
  private _store: INextStoreSystem;
  private _fileSystem: INextFileSystem;
  constructor(
    @inject(TYPES.INextStoreSystem) store: INextStoreSystem,
    @inject(TYPES.INextFileSystem) fileSystem: INextFileSystem
  ) {
    this.isMac = process.platform === 'darwin';
    this._store = store;
    this._fileSystem = fileSystem;

    // bind methods
    this.synchronousLibrary = this.synchronousLibrary.bind(this);
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
          enabled: false,
          accelerator: this.isMac ? 'Cmd+s' : 'Ctrl+s'
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
          accelerator: this.isMac ? 'Cmd+Shift+s' : 'Ctrl+Shift+s'
        },
        {
          label: '显示/隐藏详情',
          accelerator: this.isMac ? 'Cmd+Shift+d' : 'Ctrl+Shift+d'
        },
        {
          label: '显示/隐藏操作菜单',
          accelerator: this.isMac ? 'Cmd+Shift+t' : 'Ctrl+Shift+t'
        },
        {
          label: '显示/隐藏标题导航',
          accelerator: this.isMac ? 'Cmd+Shift+h' : 'Ctrl+Shift+h'
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

  createMenu(): void {
    Menu.setApplicationMenu(Menu.buildFromTemplate(this.getMenuTemplate()));
  }

  private async synchronousLibrary(_m: MenuItem, win: BrowserWindow, _event: KeyboardEvent): Promise<void> {
    const root = this._store.getConfig('rootDir');
    const rootLib: RootLibraryTree = { isRoot: true, children: [] };
    if (!isTrulyEmpty(root)) {
      const traverseDirectory = async (dir: string, workInProcess: LibraryTree | RootLibraryTree): Promise<void> => {
        const files = await nodeFs.promises.readdir(dir, { withFileTypes: true });
        const sortedFiles = files.sort((a, b) => {
          if (a.isDirectory() && b.isFile()) return -1; // folder first
          if (a.isFile() && b.isDirectory()) return 1; // file after folder
          return 0; // keep original order for same type
        });

        for (const file of sortedFiles) {
          const fullPath = nodePath.join(dir, file.name);
          const fileState = await nodeFs.promises.stat(fullPath);
          const fileInProcess: LibraryTree = {
            name: file.isDirectory() ? file.name : nodePath.basename(file.name, nodePath.extname(file.name)),
            type: file.isDirectory() ? 'folder' : 'file',
            birthTime: fileState.birthtime.toLocaleString(),
            modifiedTime: fileState.mtime.toLocaleString(),
            children: []
          };
          if ('isRoot' in workInProcess && workInProcess.isRoot) {
            file.isDirectory() && workInProcess.children.push(fileInProcess);
          } else {
            workInProcess.children.push(fileInProcess);
          }
          if (file.isDirectory()) {
            await traverseDirectory(fullPath, fileInProcess); // recursively traverse subdirectory
          } else if (!('isRoot' in workInProcess && workInProcess.isRoot)) {
            const content = await nodeFs.promises.readFile(fullPath, { encoding: 'utf8' });
            fileInProcess.description = content.substring(0, MAX_FILE_DESCRIPTION_LENGTH);
          }
        }
      };
      await traverseDirectory(root, rootLib);
      delete rootLib.isRoot; // Remove isRoot property from the object
      // Write to file
      const recordPath = nodePath.resolve(root, ROOT_CONFIG_NAME);
      this._fileSystem.writeFile(recordPath, JSON.stringify(rootLib, null, 2));
      this._store.setConfig('libraryTree', rootLib as unknown as LibraryTree);
      win.webContents.reload();
    }
  }
}

export default NextMenu;
