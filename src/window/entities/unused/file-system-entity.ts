import { inject, injectable } from 'inversify';
import fs from 'fs';
import path from 'path';
import { isEffectArray, isString, normalizeError } from 'src/tools/utils';
import { LibraryType, LibraryTree } from '_types';
import FileSystem from '../interface/file-system';
import MainGlobal from '../interface/main-global';
import { TYPES } from '../types';
import { BrowserWindow, dialog, MessageBoxOptions, OpenDialogOptions } from 'electron';

type ReadFileOptions = Parameters<typeof fs.promises.readFile>[1];
type WriteFileOptions = Parameters<typeof fs.promises.writeFile>[2];

// Root dir info file
const WORKSPACE_INFO_FILE = '.nwriter.info.json';

@injectable()
class NextFileSystem implements FileSystem {
  private _mainGlobal: MainGlobal;
  private _tree: LibraryTree[];

  constructor(@inject(TYPES.MainGlobal) _global: MainGlobal) {
    this._mainGlobal = _global;
    this._tree = [];
  }

  unifiedFilePath(filePath: string): string | undefined {
    if (isString(filePath)) {
      return filePath.split(path.sep).join(path.posix.sep);
    }
  }

  unifiedFilePaths(filePaths: string[]): string[] | undefined {
    if (isEffectArray(filePaths)) {
      return filePaths.map(filePath => this.unifiedFilePath(filePath)).filter(item => !!item);
    }
  }

  async showMessageDialog(win: BrowserWindow, message: string, opts?: Omit<MessageBoxOptions, 'message'>) {
    return dialog.showMessageBox(win, {
      type: 'warning',
      buttons: ['取消', '确认'],
      defaultId: 1,
      message,
      title: '通知',
      ...opts
    });
  }

  async showOpenDialog(win: BrowserWindow, opts?: OpenDialogOptions) {
    // Using dialog to select a file
    const { canceled, filePaths } = await dialog.showOpenDialog(win, opts);
    if (!canceled) {
      return this.unifiedFilePaths(filePaths);
    }
  }

  async showOpenImageDialog(win: BrowserWindow) {
    if (win) {
      return this.showOpenDialog(win, { filters: [{ name: 'Image', extensions: ['jpg', 'jpeg', 'gif', 'png'] }] });
    }
  }

  async logProcess(message: string, logPath?: string) {
    const defaultLogPath = path.join(this._mainGlobal.getConfig('configDir'), this._mainGlobal.getConfig('configName'));
    if (defaultLogPath) {
      // Branch that should never be enterd
      // TODO: Adding some info here to alert user, something wrong with application.
      return;
    }
    const innerPath = logPath ? defaultLogPath : logPath;
    try {
      const info = `[${new Date().toLocaleString()}] ${message}\r\n`;
      await fs.promises.writeFile(innerPath, info, { encoding: 'utf8', flag: 'a' });
    } catch (err) {
      // TODO: Making unified error catch.
    }
  }

  async readFile(filePath: string, opts?: ReadFileOptions) {
    // TEST: Test error message
    if (filePath) {
      try {
        const innerOpts = opts ?? { encoding: 'utf8' };
        return await fs.promises.readFile(filePath, innerOpts);
      } catch (err) {
        this.showMessageDialog(this._mainGlobal.getConfig('win'), normalizeError(err), { title: '读文件错误' });
      }
    }
  }

  async writeFile(filePath: string, data: string, opts?: WriteFileOptions) {
    // TEST: Test error message
    if (filePath) {
      try {
        const innerOpts = opts ?? { encoding: 'utf8' };
        return await fs.promises.writeFile(filePath, data, innerOpts);
      } catch (err) {
        this.showMessageDialog(this._mainGlobal.getConfig('win'), normalizeError(err), { title: '写文件错误' });
      }
    }
  }

  async mkFolder(folderPath: string) {
    if (!fs.existsSync(folderPath)) {
      try {
        return await fs.promises.mkdir(folderPath, { recursive: true });
      } catch (err) {
        this.showMessageDialog(this._mainGlobal.getConfig('win'), normalizeError(err), { title: '创建文件夹错误' });
      }
    }
  }

  async rmLibOrFile(path: string) {
    if (path) {
      try {
        return await fs.promises.rm(path, { recursive: true });
      } catch (err) {
        this.showMessageDialog(this._mainGlobal.getConfig('win'), normalizeError(err), { title: '删除操作错误' });
      }
    }
    // ..
  }

  getTree(): LibraryTree[] {
    return JSON.parse(JSON.stringify(this._tree));
  }

  setTree(tree: LibraryTree[]) {
    if (tree && Array.isArray(tree)) {
      this._tree = tree;
      return;
    }
    throw new Error('[next-writer] The `tree` is not a valid Array');
  }

  removeTreeItem(path: string) {
    if (!path) {
      throw new Error('[next-writer] The `path` is empty during remove library tree');
    }
    const rootDir = this._mainGlobal.getConfig('rootDir');
    if (!rootDir) {
      throw new Error('[next-writer] The `rootDir` is empty during remove library tree');
    }
    const currentTree = this.getTree() ?? [];
    const innerPath = path.startsWith(rootDir) ? path.replace(rootDir, '') : path;
    const pathTokens = innerPath.split('/').filter(item => item !== '.' && !!item);

    this.recursiveRemoveTreeItem(pathTokens, currentTree);
    this.updateLibrary(currentTree);
    this.setTree(currentTree);
  }

  recursiveRemoveTreeItem(pathTokens: string[], currentTree: LibraryTree[]) {
    if (!isEffectArray(pathTokens) || !Array.isArray(currentTree)) {
      return;
    }

    const currentPath = pathTokens.shift();
    const targetLib = currentTree.find(lib => lib.name === currentPath);
    if (targetLib) {
      if (pathTokens.length > 0) {
        this.recursiveRemoveTreeItem(pathTokens, targetLib.children);
      } else {
        const targetIndex = currentTree.findIndex(lib => lib.name === currentPath);
        currentTree.splice(targetIndex, 1);
      }
    }
  }

  updateTree(path: string, type: LibraryType) {
    if (!path) {
      throw new Error('[next-writer] The `path` is empty during update library tree');
    }
    const rootDir = this._mainGlobal.getConfig('rootDir');
    if (!rootDir) {
      throw new Error('[next-writer] The `rootDir` is empty during update library tree');
    }
    const currentTree = this.getTree() ?? [];
    const innerPath = path.startsWith(rootDir) ? path.replace(rootDir, '') : path;
    const pathTokens = innerPath.split('/').filter(item => item !== '.' && !!item);

    this.recursiveUpdateTree(pathTokens, currentTree, type);
    this.updateLibrary(currentTree);
    this.setTree(currentTree);
  }

  recursiveUpdateTree(pathTokens: string[], currentTree: LibraryTree[], type: LibraryType) {
    if (!isEffectArray(pathTokens) || !Array.isArray(currentTree)) {
      return;
    }
    const currentPath = pathTokens.shift();
    const targetLib = currentTree.find(lib => lib.name === currentPath);

    // Already have library folder or file
    if (targetLib) {
      // Already last one
      if (pathTokens.length === 0) {
        targetLib.modifiedTime = new Date().toLocaleString();
      } else {
        this.recursiveUpdateTree(pathTokens, targetLib.children, type);
      }
    } else {
      const time = new Date().toLocaleString();
      const newLib: LibraryTree = {
        name: currentPath,
        birthTime: time,
        modifiedTime: time,
        type: pathTokens.length === 0 ? type : 'folder',
        children: []
      };
      currentTree.push(newLib);
      this.recursiveUpdateTree(pathTokens, newLib.children, type);
    }
  }

  updateLibrary(tree?: LibraryTree[]) {
    // Get root dir path
    const rootDir = this._mainGlobal.getConfig('rootDir');

    if (!rootDir) {
      throw new Error('[File-System] The root dir is empty when invoke updateLibrary');
    }

    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }

    const infoFilePath = path.resolve(rootDir, WORKSPACE_INFO_FILE);

    try {
      fs.writeFileSync(infoFilePath, JSON.stringify({ tree: tree ?? [] }, null, 2), { encoding: 'utf8' });
    } catch (err) {
      throw new Error(err);
    }
  }
}

export default NextFileSystem;
