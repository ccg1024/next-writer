import nodeFs from 'fs';

export type ReadFileOptions = Parameters<typeof nodeFs.promises.readFile>[1];
export type WriteFileOptions = Parameters<typeof nodeFs.promises.writeFile>[2];

interface IFileSystem {
  formatPath<T extends string | string[]>(path: T): T | null;

  exists(path: string): Promise<boolean>;

  readFile(path: string, opt?: ReadFileOptions): Promise<string>;

  writeFile(path: string, content: string, opt?: WriteFileOptions): Promise<void>;

  ensureDir(path: string): Promise<void>;

  stat(path: string): Promise<nodeFs.Stats>;

  rename(oldPath: string, newPath: string): Promise<void>;

  removeFile(path: string): Promise<void>;

  removeEmptyDir(path: string): Promise<void>;

  readDir(path: string): Promise<nodeFs.Dirent[]>;
}

export default IFileSystem;
