import { BrowserWindow, dialog, MessageBoxOptions, OpenDialogOptions } from 'electron';
import fs from 'fs';
import path from 'path';
import { isEffectArray, isString, normalizeError } from 'src/tools/utils';
import { LibraryTree, LibraryType } from '_types';
import type MainGlobal from './main-global';

type ReadFileOptions = Parameters<typeof fs.promises.readFile>[1];
type WriteFileOptions = Parameters<typeof fs.promises.writeFile>[2];

// Root dir info file
const WORKSPACE_INFO_FILE = '.nwriter.info.json';

/**
 * Encapsulated file system, providing file reading and writing operations.
 *
 * @author crazycodegame
 *
 */
class FileSystem {
  private _mainGlobal: MainGlobal;
  private _tree: LibraryTree[];

  constructor(_global: MainGlobal) {
    this._mainGlobal = _global;
    this._tree = [];
  }
  /**
   * Unified file path between different operations system.
   *
   * @param filePath A string value of file path
   * @returns A formatted file path with unix style if `filePath` is valid string, otherwise, return `undefined`
   */
  unifiedFilePath(filePath: string): string | undefined {
    if (isString(filePath)) {
      return filePath.split(path.sep).join(path.posix.sep);
    }
  }

  /**
   * Unified a list of file path between different operations system.
   *
   * @param filePaths A list of string value of file path
   * @returns A formatted list of file path with unix style if `filePaths` is valid string list, otherwise, return `undefined`
   */
  unifiedFilePaths(filePaths: string[]): string[] | undefined {
    if (isEffectArray(filePaths)) {
      return filePaths.map(filePath => this.unifiedFilePath(filePath)).filter(item => !!item);
    }
  }

  /**
   * A message dialog preset.
   */
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

  /**
   * Using system dialog to show message for open file
   *
   * @param win Current BrowserWindow instance
   * @param opts The options for open dialog
   * @returns A filePath string if choose a file
   */
  async showOpenDialog(win: BrowserWindow, opts?: OpenDialogOptions) {
    // Using dialog to select a file
    const { canceled, filePaths } = await dialog.showOpenDialog(win, opts);
    if (!canceled) {
      return this.unifiedFilePaths(filePaths);
    }
  }

  /**
   * Using system dialog to select a image file
   */
  async showOpenImageDialog(win: BrowserWindow) {
    if (win) {
      return this.showOpenDialog(win, { filters: [{ name: 'Image', extensions: ['jpg', 'jpeg', 'gif', 'png'] }] });
    }
  }

  /**
   * Write log file information
   *
   * @param message Information subject
   * @param logPath Log file path, normally should not be set
   */
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

  /**
   * Get libraray tree
   */
  getTree(): LibraryTree[] {
    return JSON.parse(JSON.stringify(this._tree));
  }

  /**
   * Set tree
   */
  setTree(tree: LibraryTree[]) {
    if (tree && Array.isArray(tree)) {
      this._tree = tree;
      return;
    }
    throw new Error('[next-writer] The `tree` is not a valid Array');
  }

  /**
   * Rmove library Tree item
   */
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

  private recursiveRemoveTreeItem(pathTokens: string[], currentTree: LibraryTree[]) {
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

  /**
   * Update library Tree
   */
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

  private recursiveUpdateTree(pathTokens: string[], currentTree: LibraryTree[], type: LibraryType) {
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

export default FileSystem;
