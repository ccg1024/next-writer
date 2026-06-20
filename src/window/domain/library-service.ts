import type { Stats } from 'fs';
import nodePath from 'path';
import { BrowserWindow } from 'electron';
import { inject, injectable } from 'inversify';
import { MAX_FILE_DESCRIPTION_LENGTH, ROOT_CONFIG_NAME } from 'src/config/env';
import { isTrulyEmpty } from 'src/tools/utils';
import { LibraryTree, RootLibraryTree, UpdateLibRequest } from '_types';
import IAppPathStore from '../interface/app-path-store';
import IFileSystem from '../interface/file-system';
import ILibraryTreeStore from '../interface/library-tree-store';
import ILibraryService from '../interface/library-service';
import IPathResolver from '../interface/path-resolver';
import { findParentLibNode, getParentPathTokens, getTargetName, persistLibTree } from '../utils/lib-tree-utils';
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
    const rootLib: RootLibraryTree = { isRoot: true, children: [] };

    if (isTrulyEmpty(root)) {
      return;
    }

    await this.traverseDirectory(root, rootLib);
    delete rootLib.isRoot;

    await this.fileSystem.writeFile(nodePath.resolve(root, ROOT_CONFIG_NAME), JSON.stringify(rootLib, null, 2));
    this.libraryTreeStore.setTree(rootLib as unknown as LibraryTree);
    win?.webContents.reload();
  }

  async updateLibrary(data: UpdateLibRequest): Promise<LibraryTree | Record<string, never>> {
    const { operate, path, type, pathInRuntime } = data || {};

    if (isTrulyEmpty(path)) {
      throw new Error('The library path is empty.');
    }

    if (type !== 'file' && type !== 'folder') {
      throw new Error('Some thing wrong with file type.');
    }

    const pathInfo = this.pathResolver.resolveLibraryPath(path);
    const pathInfoRuntime = pathInRuntime ? this.pathResolver.resolveLibraryPath(pathInRuntime) : null;

    if (pathInfo.pathToken.length === 0) {
      throw new Error('The path is invalid.');
    }

    const targetName = getTargetName(pathInfo.pathToken);
    const targetNameInRuntime = pathInfoRuntime ? getTargetName(pathInfoRuntime.pathToken) : '';
    const rootDir = this.appPathStore.getRootDir();

    return this.libraryTreeStore.updateTree(async libTree => {
      const parentLib = findParentLibNode(libTree, getParentPathTokens(pathInfo.pathToken));

      if (isTrulyEmpty(parentLib)) {
        throw new Error('Cannot find target library path');
      }

      let resolveData: LibraryTree | null = null;

      switch (`${operate}-${type}`) {
        case 'add-file': {
          const notePath = `${pathInfo.fullPath}.md`;
          await this.fileSystem.writeFile(notePath, '');
          const fileState = await this.fileSystem.stat(notePath);
          const libToken = this.createLibraryToken(targetName, 'file', fileState);
          parentLib.children.push(libToken);
          resolveData = libToken;
          break;
        }
        case 'add-folder': {
          await this.fileSystem.ensureDir(pathInfo.fullPath);
          const folderState = await this.fileSystem.stat(pathInfo.fullPath);
          const libToken = this.createLibraryToken(targetName, 'folder', folderState);
          parentLib.children.push(libToken);
          resolveData = libToken;
          break;
        }
        case 'del-file': {
          await this.fileSystem.removeFile(`${pathInfo.fullPath}.md`);
          parentLib.children = parentLib.children.filter(lib => !(lib.name === targetName && lib.type === 'file'));
          break;
        }
        case 'del-folder': {
          const targetToken = parentLib.children.find(lib => lib.name === targetName && lib.type === 'folder');
          if (!targetToken) {
            throw new Error('The library is not found.');
          }
          if (targetToken.children.length > 0) {
            throw new Error('The folder content is not empty.');
          }
          await this.fileSystem.removeEmptyDir(pathInfo.fullPath);
          parentLib.children = parentLib.children.filter(lib => !(lib.name === targetName && lib.type === 'folder'));
          break;
        }
        case 'update-folder': {
          const targetToken = parentLib.children.find(child => child.name === targetName && child.type === 'folder');
          if (!targetToken || !pathInfoRuntime) {
            throw new Error('The library is not found.');
          }
          targetToken.name = targetNameInRuntime;
          await this.fileSystem.rename(pathInfo.fullPath, pathInfoRuntime.fullPath);
          break;
        }
      }

      await persistLibTree(libTree, rootDir, this.fileSystem);
      return resolveData ?? {};
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

      if ('isRoot' in workInProcess && workInProcess.isRoot) {
        file.isDirectory() && workInProcess.children.push(fileInProcess);
      } else {
        workInProcess.children.push(fileInProcess);
      }

      if (file.isDirectory()) {
        await this.traverseDirectory(fullPath, fileInProcess);
      } else if (!('isRoot' in workInProcess && workInProcess.isRoot)) {
        const content = await this.fileSystem.readFile(fullPath, { encoding: 'utf8' });
        fileInProcess.description = content.substring(0, MAX_FILE_DESCRIPTION_LENGTH);
      }
    }
  }

  private createLibraryToken(name: string, type: LibraryTree['type'], stat: Stats): LibraryTree {
    return {
      name,
      type,
      birthTime: stat.birthtime.toLocaleString(),
      modifiedTime: stat.mtime.toLocaleString(),
      children: []
    };
  }
}

export default LibraryService;
