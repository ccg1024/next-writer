import nodeFs from 'fs';
import nodePath from 'path';
import { injectable } from 'inversify';
import { isTrulyEmpty } from 'src/tools/utils';
import IFileSystem, { ReadFileOptions, WriteFileOptions } from '../interface/file-system';

@injectable()
class FileSystem implements IFileSystem {
  formatPath<T extends string | string[]>(path: T): T {
    if (typeof path !== 'string' && !Array.isArray(path)) {
      throw new Error('The type of `path` should be string or string[]');
    }
    const innerPaths = typeof path === 'string' ? [path] : path;
    const formatPaths = innerPaths.map(innerPath => innerPath.split(nodePath.sep).join(nodePath.posix.sep));
    return typeof path === 'string' ? formatPaths[0] : formatPaths;
  }

  async exists(path: string) {
    if (isTrulyEmpty(path)) {
      throw new Error('The `path` is truly empty when invoke `exists`');
    }
    try {
      await nodeFs.promises.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(path: string, opt?: ReadFileOptions) {
    if (isTrulyEmpty(path)) {
      throw new Error('The `path` is empty when invoke `readFile`');
    }
    const existPath = await this.exists(path);
    if (existPath) {
      const innerOpts = opt ?? { encoding: 'utf8' };
      return (await nodeFs.promises.readFile(path, innerOpts))?.toString();
    }
    throw new Error('The `path` is not exist when invoke `readFile`');
  }

  async writeFile(path: string, content: string, opt?: WriteFileOptions) {
    if (isTrulyEmpty(path)) {
      throw new Error('The `path` is empty when invoke `writeFile`');
    }
    const existPath = await this.exists(path);

    if (!existPath) {
      const dirToFile = nodePath.dirname(path);
      await this.ensureDir(dirToFile);
    }

    const innerOpts = opt ?? { encoding: 'utf8' };
    await nodeFs.promises.writeFile(path, content, innerOpts);
  }

  async ensureDir(path: string): Promise<void> {
    if (isTrulyEmpty(path)) {
      throw new Error('The `path` is empty when invoke `ensureDir`');
    }
    await nodeFs.promises.mkdir(path, { recursive: true });
  }

  async stat(path: string): Promise<nodeFs.Stats> {
    if (isTrulyEmpty(path)) {
      throw new Error('The `path` is empty when invoke `stat`');
    }
    return nodeFs.promises.stat(path);
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    if (isTrulyEmpty(oldPath) || isTrulyEmpty(newPath)) {
      throw new Error('The path is empty when invoke `rename`');
    }
    await nodeFs.promises.rename(oldPath, newPath);
  }

  async removeFile(path: string): Promise<void> {
    if (isTrulyEmpty(path)) {
      throw new Error('The `path` is empty when invoke `removeFile`');
    }
    await nodeFs.promises.rm(path);
  }

  async removeEmptyDir(path: string): Promise<void> {
    if (isTrulyEmpty(path)) {
      throw new Error('The `path` is empty when invoke `removeEmptyDir`');
    }
    await nodeFs.promises.rmdir(path);
  }

  async readDir(path: string): Promise<nodeFs.Dirent[]> {
    if (isTrulyEmpty(path)) {
      throw new Error('The `path` is empty when invoke `readDir`');
    }
    return nodeFs.promises.readdir(path, { withFileTypes: true });
  }
}

export default FileSystem;
