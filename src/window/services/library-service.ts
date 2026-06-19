import nodeFs from 'fs';
import nodePath from 'path';
import { BrowserWindow } from 'electron';
import { inject, injectable } from 'inversify';
import { MAX_FILE_DESCRIPTION_LENGTH, ROOT_CONFIG_NAME } from 'src/config/env';
import { isTrulyEmpty } from 'src/tools/utils';
import { LibraryTree, RootLibraryTree, UpdateLibRequest } from '_types';
import INextFileSystem from '../interface/next-file-system';
import INextStoreSystem from '../interface/next-store-system';
import ILibraryService from '../interface/library-service';
import IPathResolver from '../interface/path-resolver';
import { findParentLibNode, getParentPathTokens, getTargetName, persistLibTree } from '../utils/lib-tree-utils';
import { TYPES } from '../types';

@injectable()
class LibraryService implements ILibraryService {
  constructor(
    @inject(TYPES.INextFileSystem) private fileSystem: INextFileSystem,
    @inject(TYPES.INextStoreSystem) private store: INextStoreSystem,
    @inject(TYPES.IPathResolver) private pathResolver: IPathResolver
  ) {}

  async synchronizeLibrary(win?: BrowserWindow): Promise<void> {
    const root = this.store.getConfig('rootDir');
    const rootLib: RootLibraryTree = { isRoot: true, children: [] };

    if (isTrulyEmpty(root)) {
      return;
    }

    await this.traverseDirectory(root, rootLib);
    delete rootLib.isRoot;

    await this.fileSystem.writeFile(nodePath.resolve(root, ROOT_CONFIG_NAME), JSON.stringify(rootLib, null, 2));
    this.store.setConfig('libraryTree', rootLib as unknown as LibraryTree);
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
    const libTree = this.store.getConfig('libraryTree');
    const rootDir = this.store.getConfig('rootDir');
    const parentLib = findParentLibNode(libTree, getParentPathTokens(pathInfo.pathToken));

    if (isTrulyEmpty(parentLib)) {
      throw new Error('Cannot find target library path');
    }

    let resolveData: LibraryTree | null = null;

    switch (`${operate}-${type}`) {
      case 'add-file': {
        const notePath = `${pathInfo.fullPath}.md`;
        await this.fileSystem.writeFile(notePath, '');
        const fileState = await nodeFs.promises.stat(notePath);
        const libToken = this.createLibraryToken(targetName, 'file', fileState);
        parentLib.children.push(libToken);
        resolveData = libToken;
        break;
      }
      case 'add-folder': {
        await nodeFs.promises.mkdir(pathInfo.fullPath, { recursive: true });
        const folderState = await nodeFs.promises.stat(pathInfo.fullPath);
        const libToken = this.createLibraryToken(targetName, 'folder', folderState);
        parentLib.children.push(libToken);
        resolveData = libToken;
        break;
      }
      case 'del-file': {
        await nodeFs.promises.rm(`${pathInfo.fullPath}.md`);
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
        await nodeFs.promises.rmdir(pathInfo.fullPath);
        parentLib.children = parentLib.children.filter(lib => !(lib.name === targetName && lib.type === 'folder'));
        break;
      }
      case 'update-folder': {
        const targetToken = parentLib.children.find(child => child.name === targetName && child.type === 'folder');
        if (!targetToken || !pathInfoRuntime) {
          throw new Error('The library is not found.');
        }
        targetToken.name = targetNameInRuntime;
        await nodeFs.promises.rename(pathInfo.fullPath, pathInfoRuntime.fullPath);
        break;
      }
    }

    await persistLibTree(libTree, rootDir, this.store, this.fileSystem);
    return resolveData ?? {};
  }

  private async traverseDirectory(dir: string, workInProcess: LibraryTree | RootLibraryTree): Promise<void> {
    const files = await nodeFs.promises.readdir(dir, { withFileTypes: true });
    const sortedFiles = files.sort((a, b) => {
      if (a.isDirectory() && b.isFile()) return -1;
      if (a.isFile() && b.isDirectory()) return 1;
      return 0;
    });

    for (const file of sortedFiles) {
      const fullPath = nodePath.join(dir, file.name);
      const fileState = await nodeFs.promises.stat(fullPath);
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

  private createLibraryToken(name: string, type: LibraryTree['type'], stat: nodeFs.Stats): LibraryTree {
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
