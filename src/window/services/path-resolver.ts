import nodePath from 'path';
import { inject, injectable } from 'inversify';
import { isTrulyEmpty } from 'src/tools/utils';
import IRuntimeConfigStore from '../interface/runtime-config-store';
import IPathResolver, { ResolvedLibraryPath } from '../interface/path-resolver';
import { TYPES } from '../types';

@injectable()
class PathResolver implements IPathResolver {
  constructor(@inject(TYPES.IRuntimeConfigStore) private store: IRuntimeConfigStore) {}

  resolveWithinRoot(rootDir: string, targetPath: string): string {
    if (isTrulyEmpty(rootDir) || isTrulyEmpty(targetPath)) {
      throw new Error('Cannot resolve empty path.');
    }

    const root = nodePath.resolve(rootDir);
    const target = nodePath.resolve(targetPath);
    const relative = nodePath.relative(root, target);

    if (relative.startsWith('..') || nodePath.isAbsolute(relative)) {
      throw new Error('The path is outside of the allowed root.');
    }

    return target;
  }

  resolveLibraryPath(path: string, options?: { suffix?: string }): ResolvedLibraryPath {
    const rootDir = this.store.getConfig('rootDir');

    if (isTrulyEmpty(rootDir)) {
      throw new Error('The library root path is empty.');
    }

    if (isTrulyEmpty(path)) {
      throw new Error('The library path is empty.');
    }

    const root = nodePath.resolve(rootDir);
    const normalizedPath = path.split(nodePath.win32.sep).join(nodePath.posix.sep);
    const absoluteInput = nodePath.isAbsolute(normalizedPath) ? nodePath.resolve(normalizedPath) : null;
    const relativePath = absoluteInput
      ? nodePath.relative(root, this.resolveWithinRoot(root, absoluteInput))
      : normalizedPath.replace(/^\.?\//, '');
    const suffix = options?.suffix ?? '';
    const pathWithSuffix = suffix && !relativePath.endsWith(suffix) ? `${relativePath}${suffix}` : relativePath;
    const fullPath = this.resolveWithinRoot(root, nodePath.resolve(root, pathWithSuffix));
    const pathToken = relativePath.split('/').filter(token => !!token);

    return {
      relativePath,
      fullPath,
      pathToken
    };
  }
}

export default PathResolver;
