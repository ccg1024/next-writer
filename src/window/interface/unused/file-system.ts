import type { BrowserWindow, MessageBoxOptions, MessageBoxReturnValue, OpenDialogOptions } from 'electron';
import type fs from 'fs';
import { LibraryTree, LibraryType } from '_types';

type ReadFileOptions = Parameters<typeof fs.promises.readFile>[1];
type WriteFileOptions = Parameters<typeof fs.promises.writeFile>[2];

/**
 * A file system interface which used by inversifyJs
 *
 * @author crazycodegame
 */
interface FileSystem {
  /**
   * Unified file path between different operations system.
   *
   * @param filePath A string value of file path
   * @returns A formatted file path with unix style if `filePath` is valid string, otherwise, return `undefined`
   */
  unifiedFilePath(filePath: string): string | undefined;

  /**
   * Unified a list of file path between different operations system.
   *
   * @param filePaths A list of string value of file path
   * @returns A formatted list of file path with unix style if `filePaths` is valid string list, otherwise, return `undefined`
   */
  unifiedFilePaths(filePaths: string[]): string[] | undefined;

  /**
   * A message dialog preset.
   */
  showMessageDialog(
    win: BrowserWindow,
    message: string,
    opts?: Omit<MessageBoxOptions, 'message'>
  ): Promise<MessageBoxReturnValue>;

  /**
   * Using system dialog to show message for open file
   *
   * @param win Current BrowserWindow instance
   * @param opts The options for open dialog
   * @returns A filePath string if choose a file
   */
  showOpenDialog(win: BrowserWindow, opts?: OpenDialogOptions): Promise<string[]>;

  /**
   * Using system dialog to select a image file
   */
  showOpenImageDialog(win: BrowserWindow): Promise<string[]>;

  /**
   * Write log file information
   *
   * @param message Information subject
   * @param logPath Log file path, normally should not be set
   */
  logProcess(message: string, logPath?: string): Promise<void>;

  readFile(filePath: string, opts?: ReadFileOptions): Promise<string | Buffer>;

  writeFile(filePath: string, data: string, opts?: WriteFileOptions): Promise<void>;

  mkFolder(folderPath: string): Promise<string>;

  rmLibOrFile(path: string): Promise<void>;

  /**
   * Get libraray tree
   */
  getTree(): LibraryTree[];

  /**
   * Set tree
   */
  setTree(tree: LibraryTree[]): void;

  /**
   * Rmove library Tree item
   */
  removeTreeItem(path: string): void;

  /**
   * Update library Tree
   */
  updateTree(path: string, type: LibraryType): void;

  /**
   * private
   */
  recursiveRemoveTreeItem(pathTokens: string[], currentTree: LibraryTree[]): void;

  /**
   * private
   */
  recursiveUpdateTree(pathTokens: string[], currentTree: LibraryTree[], type: LibraryType): void;

  updateLibrary(tree?: LibraryTree[]): void;
}

export default FileSystem;
