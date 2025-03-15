import nodeFs from 'fs';
export type ReadFileOptions = Parameters<typeof nodeFs.promises.readFile>[1];
export type WriteFileOptions = Parameters<typeof nodeFs.promises.writeFile>[2];
/**
 * A file system interface which just provide node module fs options.
 */
interface INextFileSystem {
  /**
   * Formating `path` with unix system style
   */
  formatPath<T extends string | string[]>(path: T): T | null;

  /**
   * If the `path` is exist return true, otherwise, return false
   */
  isExist(path: string): Promise<boolean>;

  /**
   * Get the file content if the `path` is exit, otherwise, return null
   */
  readFile(path: string, opt?: ReadFileOptions): Promise<string>;

  /**
   * Write `content` to `path` directly if exit, otherwise, create dir recursively before write `content`
   */
  writeFile(path: string, content: string, opt?: WriteFileOptions): Promise<void>;
}

export default INextFileSystem;
