import nodeFs from 'fs';
import nodePath from 'path';
import { injectable } from 'inversify';
import { isTrulyEmpty } from 'src/tools/utils';
import INextFileSystem, { ReadFileOptions, WriteFileOptions } from '../interface/next-file-system';

@injectable()
class NextFileSystem implements INextFileSystem {
  formatPath<T extends string | string[]>(path: T): T {
    // Check the path type
    if (typeof path != 'string' && !Array.isArray(path)) {
      throw new Error('The type of `path` should be string or string[]');
    }
    const innerPaths = typeof path === 'string' ? [path] : path;
    const formatPaths = innerPaths.map(innerPath => innerPath.split(nodePath.sep).join(nodePath.posix.sep));
    return typeof path === 'string' ? formatPaths[0] : formatPaths;
  }

  async isExist(path: string) {
    if (isTrulyEmpty(path)) {
      throw new Error('The `path` is truly empty when invoke `isExit`');
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
    const existPath = await this.isExist(path);
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
    const existPath = await this.isExist(path);

    if (!existPath) {
      const dirToFile = nodePath.dirname(path);
      // Create dir of path to file
      await nodeFs.promises.mkdir(dirToFile, { recursive: true });
    }
    // Write content to path
    const innerOpts = opt ?? { encoding: 'utf8' };
    await nodeFs.promises.writeFile(path, content, innerOpts);
  }
}

export default NextFileSystem;
