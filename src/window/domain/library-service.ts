import type { Stats } from 'fs';
import nodePath from 'path';
import { BrowserWindow } from 'electron';
import { inject, injectable } from 'inversify';
import { MAX_FILE_DESCRIPTION_LENGTH, ROOT_CONFIG_NAME, ROOT_LIBRARY_ID } from 'src/config/env';
import { isTrulyEmpty } from 'src/tools/utils';
import { LibraryTree, RootLibraryTree, UpdateLibRequest } from '_types';
import IAppPathStore from '../interface/app-path-store';
import IFileSystem from '../interface/file-system';
import ILibraryTreeStore from '../interface/library-tree-store';
import ILibraryService from '../interface/library-service';
import IPathResolver from '../interface/path-resolver';
import {
  createLibraryNodeId,
  isLibraryTreeNode,
  persistLibTree,
  resolveLibraryNodePath
} from '../utils/lib-tree-utils';
import { TYPES } from '../types';

@injectable()
class LibraryService implements ILibraryService {
  constructor(
    @inject(TYPES.IFileSystem) private fileSystem: IFileSystem,
    @inject(TYPES.IAppPathStore) private appPathStore: IAppPathStore,
    @inject(TYPES.ILibraryTreeStore) private libraryTreeStore: ILibraryTreeStore,
    @inject(TYPES.IPathResolver) private pathResolver: IPathResolver
  ) {}

  async synchronizeLibrary(win?: BrowserWindow): Promise<void> {
    const root = this.appPathStore.getRootDir();
    const rootLib: RootLibraryTree = { id: ROOT_LIBRARY_ID, children: [] };

    if (isTrulyEmpty(root)) {
      return;
    }

    await this.traverseDirectory(root, rootLib);

    await this.fileSystem.writeFile(nodePath.resolve(root, ROOT_CONFIG_NAME), JSON.stringify(rootLib, null, 2));
    this.libraryTreeStore.setTree(rootLib);
    win?.webContents.reload();
  }

  async updateLibrary(data: UpdateLibRequest): Promise<RootLibraryTree> {
    const rootDir = this.appPathStore.getRootDir();

    return this.libraryTreeStore.updateTree(async libTree => {
      switch (data?.operate) {
        case 'add': {
          const name = this.validateLibraryName(data.name);
          const parentInfo = resolveLibraryNodePath(libTree, data.parentId, rootDir);
          const parentNode = parentInfo.node;

          if (isLibraryTreeNode(parentNode) && parentNode.type !== 'folder') {
            throw new Error('The parent library node is not a folder.');
          }

          this.assertNoDuplicate(parentNode.children, name, data.type);

          if (data.type === 'file') {
            const notePath = this.pathResolver.resolveWithinRoot(
              rootDir,
              nodePath.join(parentInfo.fullPath, `${name}.md`)
            );
            if (await this.fileSystem.exists(notePath)) {
              throw new Error('The library name already exists.');
            }
            await this.fileSystem.writeFile(notePath, '');
            const fileState = await this.fileSystem.stat(notePath);
            parentNode.children.push(this.createLibraryToken(name, 'file', fileState));
          } else {
            const folderPath = this.pathResolver.resolveWithinRoot(rootDir, nodePath.join(parentInfo.fullPath, name));
            if (await this.fileSystem.exists(folderPath)) {
              throw new Error('The library name already exists.');
            }
            await this.fileSystem.ensureDir(folderPath);
            const folderState = await this.fileSystem.stat(folderPath);
            parentNode.children.push(this.createLibraryToken(name, 'folder', folderState));
          }

          break;
        }
        case 'del': {
          const nodeInfo = resolveLibraryNodePath(libTree, data.id, rootDir);
          const targetNode = this.requireLibraryNode(nodeInfo.node);
          const parentNode = nodeInfo.parent;

          if (!parentNode) {
            throw new Error('The root library cannot be deleted.');
          }

          if (targetNode.type === 'file') {
            await this.fileSystem.removeFile(nodeInfo.fullPath);
          } else {
            if (targetNode.children.length > 0) {
              throw new Error('The folder content is not empty.');
            }
            await this.fileSystem.removeEmptyDir(nodeInfo.fullPath);
          }

          parentNode.children = parentNode.children.filter(child => child.id !== targetNode.id);
          break;
        }
        case 'rename': {
          const name = this.validateLibraryName(data.name);
          const nodeInfo = resolveLibraryNodePath(libTree, data.id, rootDir);
          const targetNode = this.requireLibraryNode(nodeInfo.node);
          const parentNode = nodeInfo.parent;

          if (!parentNode) {
            throw new Error('The root library cannot be renamed.');
          }

          if (name === targetNode.name) {
            break;
          }

          this.assertNoDuplicate(parentNode.children, name, targetNode.type, targetNode.id);

          const parentPath = this.pathResolver.resolveWithinRoot(
            rootDir,
            nodePath.resolve(rootDir, ...nodeInfo.parentPathTokens)
          );
          const nextFullPath =
            targetNode.type === 'file'
              ? this.pathResolver.resolveWithinRoot(rootDir, nodePath.join(parentPath, `${name}.md`))
              : this.pathResolver.resolveWithinRoot(rootDir, nodePath.join(parentPath, name));

          if (await this.fileSystem.exists(nextFullPath)) {
            throw new Error('The library name already exists.');
          }

          await this.fileSystem.rename(nodeInfo.fullPath, nextFullPath);
          const newStat = await this.fileSystem.stat(nextFullPath);
          targetNode.name = name;
          targetNode.modifiedTime = newStat.mtime.toLocaleString();
          break;
        }
        default:
          throw new Error('Unsupported library operation.');
      }

      await persistLibTree(libTree, rootDir, this.fileSystem);
      return libTree;
    });
  }

  private async traverseDirectory(dir: string, workInProcess: LibraryTree | RootLibraryTree): Promise<void> {
    const files = await this.fileSystem.readDir(dir);
    const sortedFiles = files.sort((a, b) => {
      if (a.isDirectory() && b.isFile()) return -1;
      if (a.isFile() && b.isDirectory()) return 1;
      return 0;
    });

    for (const file of sortedFiles) {
      const fullPath = nodePath.join(dir, file.name);
      const fileState = await this.fileSystem.stat(fullPath);
      const fileInProcess = this.createLibraryToken(
        file.isDirectory() ? file.name : nodePath.basename(file.name, nodePath.extname(file.name)),
        file.isDirectory() ? 'folder' : 'file',
        fileState
      );

      if (workInProcess.id === ROOT_LIBRARY_ID) {
        file.isDirectory() && workInProcess.children.push(fileInProcess);
      } else {
        workInProcess.children.push(fileInProcess);
      }

      if (file.isDirectory()) {
        await this.traverseDirectory(fullPath, fileInProcess);
      } else if (workInProcess.id !== ROOT_LIBRARY_ID) {
        const content = await this.fileSystem.readFile(fullPath, { encoding: 'utf8' });
        fileInProcess.description = content.substring(0, MAX_FILE_DESCRIPTION_LENGTH);
      }
    }
  }

  private createLibraryToken(name: string, type: LibraryTree['type'], stat: Stats): LibraryTree {
    return {
      id: createLibraryNodeId(),
      name,
      type,
      birthTime: stat.birthtime.toLocaleString(),
      modifiedTime: stat.mtime.toLocaleString(),
      children: []
    };
  }

  private validateLibraryName(name: string): string {
    const normalizedName = typeof name === 'string' ? name.trim() : '';

    if (isTrulyEmpty(normalizedName)) {
      throw new Error('The library name is empty.');
    }

    if (normalizedName.includes('/') || normalizedName.includes('\\')) {
      throw new Error('The library name cannot contain path separators.');
    }

    if (normalizedName === '.' || normalizedName === '..') {
      throw new Error('The library name is invalid.');
    }

    return normalizedName;
  }

  private assertNoDuplicate(
    children: LibraryTree[],
    name: string,
    type: LibraryTree['type'],
    currentId?: string
  ): void {
    if (children.some(child => child.id !== currentId && child.name === name && child.type === type)) {
      throw new Error('The library name already exists.');
    }
  }

  private requireLibraryNode(node: LibraryTree | RootLibraryTree): LibraryTree {
    if (!isLibraryTreeNode(node)) {
      throw new Error('The target library node is invalid.');
    }

    return node;
  }
}

export default LibraryService;
