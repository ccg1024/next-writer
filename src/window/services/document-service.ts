import nodeFs from 'fs';
import nodePath from 'path';
import { inject, injectable } from 'inversify';
import { MAX_FILE_DESCRIPTION_LENGTH } from 'src/config/env';
import { isTrulyEmpty } from 'src/tools/utils';
import { ReadFileRequest, ReadFileResponse, UpdateCacheRequest, WriteFileRequest } from '_types';
import INextCacheSystem from '../interface/next-cache-system';
import INextFileSystem from '../interface/next-file-system';
import INextStoreSystem from '../interface/next-store-system';
import IDocumentService from '../interface/document-service';
import IPathResolver from '../interface/path-resolver';
import { findParentLibNode, getParentPathTokens, getTargetName, persistLibTree } from '../utils/lib-tree-utils';
import { TYPES } from '../types';

@injectable()
class DocumentService implements IDocumentService {
  constructor(
    @inject(TYPES.INextFileSystem) private fileSystem: INextFileSystem,
    @inject(TYPES.INextStoreSystem) private store: INextStoreSystem,
    @inject(TYPES.INextCacheSystem) private cache: INextCacheSystem,
    @inject(TYPES.IPathResolver) private pathResolver: IPathResolver
  ) {}

  async readFile(data: ReadFileRequest): Promise<ReadFileResponse> {
    const pathInfo = this.pathResolver.resolveLibraryPath(data?.path, { suffix: '.md' });
    const buffer = this.cache.getCache(pathInfo.fullPath);
    const isCacheContentEmpty =
      buffer && (buffer.content === '' || buffer.content === undefined || buffer.content === null);
    const content =
      buffer && !isCacheContentEmpty
        ? buffer.content
        : await this.fileSystem.readFile(pathInfo.fullPath, { encoding: 'utf8' });

    if (!buffer || isCacheContentEmpty) {
      this.cache.addCache(pathInfo.fullPath, { isChange: false, content });
    }

    return { content };
  }

  async writeFile(data: WriteFileRequest): Promise<void> {
    const { path, content, nameInRuntime } = data ?? {};
    const pathInfo = this.pathResolver.resolveLibraryPath(path, { suffix: '.md' });

    if (pathInfo.pathToken.length === 0) {
      throw new Error('The path is invalid.');
    }

    let fullPath = pathInfo.fullPath;
    const targetName = getTargetName(pathInfo.pathToken, { stripExtension: true });
    const libTree = this.store.getConfig('libraryTree');
    const rootDir = this.store.getConfig('rootDir');
    const parentLib = findParentLibNode(libTree, getParentPathTokens(pathInfo.pathToken));

    if (isTrulyEmpty(parentLib)) {
      throw new Error('Cannot find target library path');
    }

    const target = parentLib.children.find(lib => lib.name === targetName);

    if (isTrulyEmpty(target)) {
      throw new Error('Some thing wrong when find target lib token');
    }

    if (!isTrulyEmpty(nameInRuntime)) {
      const dirname = nodePath.dirname(fullPath);
      const oldFullPath = fullPath;
      fullPath = this.pathResolver.resolveWithinRoot(rootDir, nodePath.join(dirname, `${nameInRuntime}.md`));
      await nodeFs.promises.rename(oldFullPath, fullPath);
      target.name = nameInRuntime;

      if (this.cache.exitCache(oldFullPath)) {
        this.cache.removeCache(oldFullPath);
      }
    }

    try {
      await this.fileSystem.writeFile(fullPath, content);

      if (this.cache.exitCache(fullPath)) {
        this.cache.update(fullPath, { isChange: false, content });
      } else {
        this.cache.addCache(fullPath, { isChange: false, content });
      }

      const newStat = await nodeFs.promises.stat(fullPath);
      target.modifiedTime = newStat.mtime.toLocaleString();
      target.description = content.substring(0, MAX_FILE_DESCRIPTION_LENGTH);
    } catch {
      throw new Error('保存文件失败');
    }

    await persistLibTree(libTree, rootDir, this.store, this.fileSystem);
  }

  async updateCache(data: UpdateCacheRequest): Promise<{ success: boolean }> {
    const { path, content, isChange } = data ?? {};
    const pathInfo = this.pathResolver.resolveLibraryPath(path, { suffix: '.md' });

    if (this.cache.exitCache(pathInfo.fullPath)) {
      this.cache.update(pathInfo.fullPath, { isChange, content });
    } else {
      this.cache.addCache(pathInfo.fullPath, { isChange, content });
    }

    return { success: true };
  }
}

export default DocumentService;
