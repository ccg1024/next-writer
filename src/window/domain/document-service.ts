import nodePath from 'path';
import { inject, injectable } from 'inversify';
import { MAX_FILE_DESCRIPTION_LENGTH } from 'src/config/env';
import { isTrulyEmpty } from 'src/tools/utils';
import { ReadFileRequest, ReadFileResponse, UpdateCacheRequest, WriteFileRequest } from '_types';
import IDocumentCacheService from '../interface/document-cache-service';
import IFileSystem from '../interface/file-system';
import IRuntimeConfigStore from '../interface/runtime-config-store';
import IDocumentService from '../interface/document-service';
import IPathResolver from '../interface/path-resolver';
import { findParentLibNode, getParentPathTokens, getTargetName, persistLibTree } from '../utils/lib-tree-utils';
import { TYPES } from '../types';

@injectable()
class DocumentService implements IDocumentService {
  private readonly cacheRevisions = new Map<string, number>();

  constructor(
    @inject(TYPES.IFileSystem) private fileSystem: IFileSystem,
    @inject(TYPES.IRuntimeConfigStore) private store: IRuntimeConfigStore,
    @inject(TYPES.IDocumentCacheService) private cache: IDocumentCacheService,
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
    const { path, content, nameInRuntime, revision } = data ?? {};
    const pathInfo = this.pathResolver.resolveLibraryPath(path, { suffix: '.md' });
    const saveRevision = this.normalizeRevision(revision);

    if (pathInfo.pathToken.length === 0) {
      throw new Error('The path is invalid.');
    }

    let fullPath = pathInfo.fullPath;
    let oldFullPath = fullPath;
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
      oldFullPath = fullPath;
      fullPath = this.pathResolver.resolveWithinRoot(rootDir, nodePath.join(dirname, `${nameInRuntime}.md`));
      await this.fileSystem.rename(oldFullPath, fullPath);
      target.name = nameInRuntime;
    }

    try {
      await this.fileSystem.writeFile(fullPath, content);

      if (this.isRevisionCurrent(saveRevision, oldFullPath, fullPath)) {
        this.markRevision(saveRevision, oldFullPath, fullPath);

        if (this.cache.hasCache(fullPath)) {
          this.cache.update(fullPath, { isChange: false, content, revision: saveRevision });
        } else {
          this.cache.addCache(fullPath, { isChange: false, content, revision: saveRevision });
        }

        if (oldFullPath !== fullPath && this.cache.hasCache(oldFullPath)) {
          this.cache.removeCache(oldFullPath);
        }
      }

      const newStat = await this.fileSystem.stat(fullPath);
      target.modifiedTime = newStat.mtime.toLocaleString();
      target.description = content.substring(0, MAX_FILE_DESCRIPTION_LENGTH);
    } catch {
      throw new Error('保存文件失败');
    }

    await persistLibTree(libTree, rootDir, this.store, this.fileSystem);
  }

  async updateCache(data: UpdateCacheRequest): Promise<{ success: boolean }> {
    const { path, content, isChange, revision } = data ?? {};
    const pathInfo = this.pathResolver.resolveLibraryPath(path, { suffix: '.md' });
    const cacheRevision = this.normalizeRevision(revision);

    if (!this.isRevisionCurrent(cacheRevision, pathInfo.fullPath)) {
      return { success: true };
    }

    this.markRevision(cacheRevision, pathInfo.fullPath);

    if (this.cache.hasCache(pathInfo.fullPath)) {
      this.cache.update(pathInfo.fullPath, { isChange, content, revision: cacheRevision });
    } else {
      this.cache.addCache(pathInfo.fullPath, { isChange, content, revision: cacheRevision });
    }

    return { success: true };
  }

  private normalizeRevision(revision?: number): number {
    return typeof revision === 'number' && Number.isFinite(revision) ? revision : 0;
  }

  private isRevisionCurrent(revision: number, ...paths: string[]): boolean {
    return revision >= this.getLatestRevision(...paths);
  }

  private getLatestRevision(...paths: string[]): number {
    return paths.reduce((latest, path) => Math.max(latest, this.cacheRevisions.get(path) ?? 0), 0);
  }

  private markRevision(revision: number, ...paths: string[]): void {
    paths.forEach(path => {
      const currentRevision = this.cacheRevisions.get(path) ?? 0;
      if (revision >= currentRevision) {
        this.cacheRevisions.set(path, revision);
      }
    });
  }
}

export default DocumentService;
