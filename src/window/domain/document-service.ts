import { inject, injectable } from 'inversify';
import { MAX_FILE_DESCRIPTION_LENGTH } from 'src/config/env';
import { ReadFileRequest, ReadFileResponse, RootLibraryTree, UpdateCacheRequest, WriteFileRequest } from '_types';
import IAppPathStore from '../interface/app-path-store';
import IDocumentCacheService from '../interface/document-cache-service';
import IFileSystem from '../interface/file-system';
import ILibraryTreeStore from '../interface/library-tree-store';
import IDocumentService from '../interface/document-service';
import { isLibraryTreeNode, persistLibTree, resolveLibraryNodePath } from '../utils/lib-tree-utils';
import { TYPES } from '../types';

@injectable()
class DocumentService implements IDocumentService {
  private readonly cacheRevisions = new Map<string, number>();

  constructor(
    @inject(TYPES.IFileSystem) private fileSystem: IFileSystem,
    @inject(TYPES.IAppPathStore) private appPathStore: IAppPathStore,
    @inject(TYPES.ILibraryTreeStore) private libraryTreeStore: ILibraryTreeStore,
    @inject(TYPES.IDocumentCacheService) private cache: IDocumentCacheService
  ) {}

  async readFile(data: ReadFileRequest): Promise<ReadFileResponse> {
    const { id } = data ?? {};
    const pathInfo = this.resolveFileNode(id);
    const buffer = this.cache.getCache(id);
    const isCacheContentEmpty =
      buffer && (buffer.content === '' || buffer.content === undefined || buffer.content === null);
    const content =
      buffer && !isCacheContentEmpty
        ? buffer.content
        : await this.fileSystem.readFile(pathInfo.fullPath, { encoding: 'utf8' });

    if (!buffer || isCacheContentEmpty) {
      this.cache.addCache(id, { isChange: false, content });
    }

    return { content };
  }

  async writeFile(data: WriteFileRequest): Promise<RootLibraryTree> {
    const { id, content, revision } = data ?? {};
    const saveRevision = this.normalizeRevision(revision);
    const rootDir = this.appPathStore.getRootDir();

    return this.libraryTreeStore.updateTree(async libTree => {
      const pathInfo = this.resolveFileNode(id, libTree);
      try {
        await this.fileSystem.writeFile(pathInfo.fullPath, content);

        if (this.isRevisionCurrent(saveRevision, id)) {
          this.markRevision(saveRevision, id);

          if (this.cache.hasCache(id)) {
            this.cache.update(id, { isChange: false, content, revision: saveRevision });
          } else {
            this.cache.addCache(id, { isChange: false, content, revision: saveRevision });
          }
        }

        const newStat = await this.fileSystem.stat(pathInfo.fullPath);
        pathInfo.node.modifiedTime = newStat.mtime.toLocaleString();
        pathInfo.node.description = content.substring(0, MAX_FILE_DESCRIPTION_LENGTH);
      } catch {
        throw new Error('保存文件失败');
      }

      await persistLibTree(libTree, rootDir, this.fileSystem);
      return libTree;
    });
  }

  async updateCache(data: UpdateCacheRequest): Promise<{ success: boolean }> {
    const { id, content, isChange, revision } = data ?? {};
    this.resolveFileNode(id);
    const cacheRevision = this.normalizeRevision(revision);

    if (!this.isRevisionCurrent(cacheRevision, id)) {
      return { success: true };
    }

    this.markRevision(cacheRevision, id);

    if (this.cache.hasCache(id)) {
      this.cache.update(id, { isChange, content, revision: cacheRevision });
    } else {
      this.cache.addCache(id, { isChange, content, revision: cacheRevision });
    }

    return { success: true };
  }

  private resolveFileNode(id: string, libTree: RootLibraryTree = this.libraryTreeStore.getTree()) {
    const pathInfo = resolveLibraryNodePath(libTree, id, this.appPathStore.getRootDir());

    if (!isLibraryTreeNode(pathInfo.node) || pathInfo.node.type !== 'file') {
      throw new Error('The target library node is not a file.');
    }

    return {
      ...pathInfo,
      node: pathInfo.node
    };
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
