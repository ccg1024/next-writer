import { ipcMain, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import { SERVER_CHANNEL } from 'src/tools/config';
import { normalizeError } from 'src/tools/utils';
import { NormalObject, Request, RequestAddLibOrFile, RequestDelLibOrFile, Response } from '_types';
import FileSystem from '../sys/file-system';
import MainGlobal from '../sys/main-global';

export const IPC_SERVER_NAME = 'ipc-server';

/**
 * Simulating server services
 *
 * @author crazycodegame
 */
class IpcServer {
  private _fileSystem: FileSystem;
  private _mainGlobal: MainGlobal;

  constructor(fileSystem: FileSystem, mainGlobal: MainGlobal) {
    this._fileSystem = fileSystem;
    this._mainGlobal = mainGlobal;

    this.listener = this.listener.bind(this);
  }
  // Start server
  listen() {
    ipcMain.handle(IPC_SERVER_NAME, this.listener);
  }

  // Remove all server listener
  destroy() {
    ipcMain.removeHandler(IPC_SERVER_NAME);
  }

  // Handle renderer process request
  listener(_e: IpcMainInvokeEvent, req: Request): Promise<Response> {
    if (req) {
      const { type, data } = req;
      return this.dispatch(type, data);
    }
  }

  // Dispatch task to deal with renderer process request
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
    }
  }

  // Add library folder of file in root dir
  async addLibOrFile(data: RequestAddLibOrFile): Promise<Response> {
    return this.modifyLibOrFile('add', data);
  }

  // Delete library folder or file in root dir
  async delLibOrFile(data: RequestDelLibOrFile) {
    return this.modifyLibOrFile('del', data);
  }

  // Modify option in root dir for `add` or `del`
  async modifyLibOrFile(option: 'add' | 'del', data: RequestAddLibOrFile | RequestDelLibOrFile): Promise<Response> {
    const { type, path: _path } = data ?? {};
    const rootDir = this._mainGlobal.getConfig('rootDir');
    const innerPath = _path.startsWith(rootDir) ? _path : path.resolve(rootDir, _path);
    try {
      if (option === 'add') {
        if (type === 'file') {
          await this._fileSystem.writeFile(path.resolve(innerPath, '.md'), '');
        }
        if (type === 'folder') {
          await this._fileSystem.mkFolder(innerPath);
        }
        this._fileSystem.updateTree(innerPath, type);
      } else if (option === 'del') {
        await this._fileSystem.rmLibOrFile(innerPath);
        this._fileSystem.removeTreeItem(innerPath);
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
}

export default IpcServer;
