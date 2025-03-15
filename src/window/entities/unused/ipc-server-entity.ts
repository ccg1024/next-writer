import path from 'path';
import { ipcMain } from 'electron';
import { inject, injectable } from 'inversify';
import { SERVER_CHANNEL } from 'src/tools/config';
import { NormalObject, Request, Response } from '_types';
import FileSystem from '../interface/file-system';
import IpcServer from '../interface/ipc-server';
import MainGlobal from '../interface/main-global';
import { TYPES } from '../types';
import { IAddLibOrFile, IDelLibOrFile, QueryFileDTO } from 'src/types/api';
import { normalizeError } from 'src/tools/utils';

export const IPC_SERVER_NAME = 'ipc-server';

/**
 * A implements of ipc-server interface
 */
@injectable()
class NextIpcServer implements IpcServer {
  private _fileSystem: FileSystem;
  private _mainGlobal: MainGlobal;

  constructor(@inject(TYPES.FileSystem) _fileSystem: FileSystem, @inject(TYPES.MainGlobal) _mainGlobal: MainGlobal) {
    this._fileSystem = _fileSystem;
    this._mainGlobal = _mainGlobal;

    this.listener = this.listener.bind(this);
  }

  listen(): void {
    ipcMain.handle(IPC_SERVER_NAME, this.listener);
  }

  destroy(): void {
    ipcMain.removeHandler(IPC_SERVER_NAME);
  }

  listener(_e: Electron.IpcMainInvokeEvent, req: Request): Promise<Response> {
    if (req) {
      const { type, data } = req;
      return this.dispatch(type, data);
    }
  }

  async dispatch(type: string, data?: NormalObject): Promise<Response> {
    switch (type) {
      case SERVER_CHANNEL.addLibOrFile:
        return this.addLibOrFile(data);
      case SERVER_CHANNEL.delLibOrFile:
        return this.delLibOrFile(data);
      case SERVER_CHANNEL.readConfig:
        return this.readConfig();
      case SERVER_CHANNEL.getLibrary:
        return this.getLibrary();
      case SERVER_CHANNEL.queryFile:
        return this.queryFile(data);
    }
  }

  private getPath(_path: string) {
    const rootDir = this._mainGlobal.getConfig('rootDir');
    return _path.startsWith(rootDir) ? _path : path.resolve(rootDir, _path);
  }

  // Add library folder of file in root dir
  async addLibOrFile(data: IAddLibOrFile): Promise<Response> {
    return this.modifyLibOrFile('add', data);
  }

  // Delete library folder or file in root dir
  async delLibOrFile(data: IDelLibOrFile) {
    return this.modifyLibOrFile('del', data);
  }

  // Modify option in root dir for `add` or `del`
  async modifyLibOrFile(option: 'add' | 'del', data: IAddLibOrFile): Promise<Response> {
    const { type, path: _path, title } = data ?? {};
    const rootDir = this._mainGlobal.getConfig('rootDir');
    const connectPath = path.join(_path, title);
    const innerPath = connectPath.startsWith(rootDir) ? connectPath : path.resolve(rootDir, connectPath);
    const target = type === 'file' ? `${innerPath}.nwriter` : innerPath;
    try {
      if (option === 'add') {
        if (type === 'file') {
          await this._fileSystem.writeFile(target, '');
        }
        if (type === 'folder') {
          await this._fileSystem.mkFolder(target);
        }
        this._fileSystem.updateTree(innerPath, type); // update file system, do not need .nwrtier
      } else if (option === 'del') {
        await this._fileSystem.rmLibOrFile(target);
        this._fileSystem.removeTreeItem(innerPath); // update file system, do not need .nwrtier
      }
      return {
        status: 0,
        data: null,
        message: ''
      };
    } catch (err) {
      return {
        status: -1,
        data: null,
        message: normalizeError(err)
      };
    }
  }

  // Return renderer process config
  async readConfig() {
    return {
      status: 0,
      data: this._mainGlobal.getConfig('renderConfig'),
      message: ''
    };
  }

  // Return library context
  async getLibrary() {
    return {
      status: 0,
      data: this._fileSystem.getTree(),
      message: ''
    };
  }

  async queryFile(data: QueryFileDTO) {
    const { path: filePath } = data ?? {};
    const innerPath = this.getPath(filePath);
    try {
      const fileBuffer = await this._fileSystem.readFile(`${innerPath}.nwriter`);
      return {
        status: 0,
        data: {
          content: fileBuffer.toString()
        },
        message: ''
      };
    } catch (err) {
      // ..
    }

    return {
      status: -1,
      data: null,
      message: 'some thing wrong, when query file'
    };
  }
}

export default NextIpcServer;
