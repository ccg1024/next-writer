// Making comunication with rederer process
import { ipcMain, shell, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import fs from 'fs';
import path from 'path';
import { ipcChannel } from '../config/ipc';
import {
  generateReadFileIpcValue,
  constructFileData,
  createFileProcess,
  generateFileDescripter,
  writeRootWorkstationInfo,
  addLibraryFile,
  addLibrary
} from './unused_file_process';
import { exitCache, getCache, updateCache } from './unused_cache';
import {
  deleteRootWorkplatformInfoUnit,
  formatedMessage,
  getLibNameFromPath,
  getRelativePath,
  isWorkpaltformInLib,
  syncWorkstationInfo,
  updateSaveFileMenuItem,
  updateWorkstationInfo,
  updateWorkstationInfoWithWrite
} from './utils';
import { handleToggleHeadNav, handleToggleSidebar } from './menu/menu-callback';
import {
  AddFileItem,
  IpcChannelData,
  IpcRequest,
  IpcResponse,
  CacheContent,
  UpdateCacheContent,
  Obj,
  FrontMatter
} from '_types';
import matter from 'gray-matter';
import { alertError, warnInfo } from './unused_dialog';

async function handleOpenFileFromRenderer(_: unknown, filePath: string) {
  // check whether have cache
  let readFileIpcValue = null;
  if (exitCache(filePath)) {
    const cache = getCache(filePath);
    readFileIpcValue = generateReadFileIpcValue(filePath, cache.content, cache.isChange);
  } else {
    readFileIpcValue = await constructFileData(filePath);
  }
  global._next_writer_windowConfig.workPlatform = filePath;
  global._next_writer_windowConfig.win.webContents.send(ipcChannel['main-to-render'].editor_component, {
    type: 'readfile',
    value: readFileIpcValue
  } as IpcChannelData);
}

function handleUpdateCache(_e: unknown, update: Partial<CacheContent> & { filePath: string }) {
  if (!update) return;

  const { filePath, ...cache } = update;

  updateCache(filePath, cache);
}

async function handleSave(_: unknown, content: string) {
  // save file

  // if not mount file path, open dialog to create a file path
  if (global._next_writer_windowConfig.workPlatform == '') {
    const newFile = await createFileProcess(global._next_writer_windowConfig.win);
    if (!newFile) return;

    global._next_writer_windowConfig.workPlatform = newFile;
    // notify renderer to show new file information.
    global._next_writer_windowConfig.win.webContents.send(
      ipcChannel['main-to-render'].sidebar_component,
      {
        type: 'sidebar-save-empty',
        value: { ...generateFileDescripter(newFile) }
      } as IpcChannelData
      // generateFileDescripter(newFile)
    );
  }

  const filePath = global._next_writer_windowConfig.workPlatform;
  updateCache(filePath, {
    isChange: false,
    content: content
  });

  const writeStream = fs.createWriteStream(filePath, {
    encoding: 'utf-8'
  });
  writeStream.write(content);
  writeStream.end();
  writeStream.on('finish', () => {
    // some code for file lock
  });
}

async function listener(_e: IpcMainEvent, req: IpcRequest) {
  if (!req) return;

  // From filesystem components
  if (req.type === 'open-file') {
    let readFileIpcValue = null;
    const _data = req.data as Obj;
    const filePath = _data.filePath as string;
    if (!filePath) throw new Error('The request data prop `filePath` is empty.');
    const root = global._next_writer_windowConfig.root;
    const isLibrary = filePath.startsWith('./');
    const fullpath = filePath.startsWith('./') ? path.resolve(root, filePath) : filePath;

    if (exitCache(fullpath)) {
      const cache = getCache(fullpath);
      readFileIpcValue = generateReadFileIpcValue(fullpath, cache.content, cache.isChange);
    } else {
      readFileIpcValue = await constructFileData(fullpath);
    }
    global._next_writer_windowConfig.workPlatform = fullpath;
    global._next_writer_windowConfig.win.webContents.send(ipcChannel['main-to-render'].editor_component, {
      type: 'readfile',
      value: { ...readFileIpcValue, isLibrary, reqPath: filePath }
    } as IpcChannelData);
    updateSaveFileMenuItem(fullpath);
  } else if (req.type === 'open-recent-file') {
    // From filelist components open recent file
    const _data = req.data as Obj;
    const filePath = <string>_data.filePath;
    if (filePath) handleOpenFileFromRenderer(null, filePath);
  } else if (req.type === 'update-cache') {
    const update = <UpdateCacheContent>req.data;
    handleUpdateCache(null, update);
  } else if (req.type === 'save-file') {
    const _data = req.data as Obj;
    const content = _data.content;
    if (typeof content === 'string') handleSave(null, content);
  } else if (req.type === 'open-url-link') {
    const _data = req.data as Obj;
    const url = _data.url;

    if (typeof url !== 'string') return;

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      shell.openExternal('http://' + url);
      return;
    }
    shell.openExternal(url);
  } else if (req.type === 'render-toggle-sidebar') {
    handleToggleSidebar(global._next_writer_windowConfig.win);
  } else if (req.type === 'render-toggle-headNav') {
    handleToggleHeadNav(global._next_writer_windowConfig.win);
  } else if (req.type === 'save-library-file') {
    // NOTE: This is a new type of 'save-file'
    const content = req.data.content;
    if (typeof content !== 'string') {
      throw new Error('The content property is not right on save-library-file channel');
    }
    const filePath = global._next_writer_windowConfig.workPlatform;
    updateCache(filePath, {
      isChange: false,
      content: content
    });

    // make a write stream
    const writeStream = fs.createWriteStream(filePath, {
      encoding: 'utf-8'
    });
    writeStream.write(content);
    writeStream.end();

    // update rootWorkplatformInfo
    const nextFrontMatter = matter(content);
    // update item that already exist
    updateWorkstationInfoWithWrite(filePath, nextFrontMatter.data as FrontMatter);
    // sync stageWorkstationInfo
    syncWorkstationInfo(getRelativePath(filePath));
    // write stageWorkstationInfo to .nwriter.info.json
    await writeRootWorkstationInfo().catch(err => {
      throw err;
    });
  } else if (req.type === 'update-library-front-matter') {
    const filePath = global._next_writer_windowConfig.workPlatform;
    const state = req.data.state as keyof FrontMatter;
    const stateValue = req.data.stateValue as string;
    updateWorkstationInfoWithWrite(filePath, { [state]: stateValue });
  }
}

async function handler(_e: IpcMainInvokeEvent, req: IpcRequest): Promise<IpcResponse> {
  if (!req) return;

  const root = global._next_writer_windowConfig.root;

  if (!root) throw formatedMessage('The root dir is empty', 'error');

  if (req.type === 'add-file-from-render') {
    // Add a new file/folder to root dir

    const reqBody = req.data as AddFileItem;

    const subpath = reqBody.option === 'file' ? reqBody.path + '.md' : reqBody.path;

    const fullpath = path.resolve(root, subpath);

    // check whether path exist
    if (fs.existsSync(fullpath)) {
      throw formatedMessage(`The path: ${fullpath} already exists.`, 'error');
    }

    // update memo workstation info
    updateWorkstationInfo(subpath, reqBody.option);
    await writeRootWorkstationInfo().catch(err => {
      throw err;
    });
    if (reqBody.option === 'file') {
      // If not, create a empty file.
      await fs.promises.writeFile(fullpath, '').catch(err => {
        throw err;
      });
    } else {
      // Create a folder
      await fs.promises.mkdir(fullpath, { recursive: true }).catch(err => {
        throw err;
      });
    }

    return {
      data: { status: 'success' }
    };
  } else if (req.type === 'read-root-workplatform-info') {
    return {
      data: {
        rootWrokplatformInfo: global._next_writer_windowConfig.rootWorkplatformInfo
      }
    };
  } else if (req.type === 'read-current-workstation') {
    return {
      data: { workPlatform: global._next_writer_windowConfig.workPlatform }
    };
  } else if (req.type === 'read-render-config') {
    return {
      data: { renderConfig: global._next_writer_windowConfig.renderConfig }
    };
  } else if (req.type === 'process-config') {
    return {
      data: { root: global._next_writer_windowConfig.root }
    };
  } else if (req.type === 'add-library-file') {
    // NOTE: this is new type for `add-file-from-render` which using on `sidebar-component`
    const library = req.data.library;
    if (typeof library !== 'string') {
      throw new Error(`The 'library' is not right on 'add-library-file' ipc`);
    }
    const newLibraryFile = addLibraryFile(library);

    return {
      data: {
        status: 'success',
        libraryFile: newLibraryFile
      }
    };
  } else if (req.type === 'add-library') {
    const { library, newLibName } = req.data;
    if (typeof library !== 'string' || typeof newLibName !== 'string') {
      throw new Error(`The 'library' is not right, on 'add-library-file' ipc`);
    }
    const formatLib = path.join(library, newLibName);
    const result = addLibrary(formatLib.startsWith('.') ? formatLib : `./${formatLib}`);

    if (result === -1) {
      return Promise.reject(`[next-writer]: 库名[${formatLib}]已存在`);
    }

    return {
      data: {
        status: 'success'
      }
    };
  } else if (req.type === 'delete-libOrfile') {
    const { type, pathInLib } = req.data;
    if (typeof type !== 'string') {
      throw new Error('`type` is not string in delete-libOrfile');
    }
    if (typeof pathInLib !== 'string') {
      throw new Error('`pathInLib` is not string in delete-libOrfile');
    }
    if (!pathInLib) {
      throw new Error('`pathInLib` is empty in delete-libOrfile');
    }
    if (type !== 'file' && type !== 'folder') {
      throw new Error('`type` is not equal to file or folder in delete-libOrfile');
    }
    const { response } = await warnInfo(
      `确定删除当前${type == 'file' ? '笔记' : `库: ${getLibNameFromPath(pathInLib)}`}?`,
      global._next_writer_windowConfig.win
    );
    if (response == 0) {
      return {
        data: {
          status: 'cancel'
        }
      };
    }

    // begin delete file or lib
    const root = global._next_writer_windowConfig.root;
    const fullpath = path.resolve(root, pathInLib);

    try {
      fs.rmSync(fullpath, { recursive: true });
    } catch (err) {
      alertError('文件操作错误', err.message);
      return {
        data: {
          status: 'error'
        }
      };
    }
    // update Menu
    if (isWorkpaltformInLib(pathInLib)) {
      updateSaveFileMenuItem(null);
    }
    // update rootWorkplatformInfo
    try {
      deleteRootWorkplatformInfoUnit(pathInLib, type);
      await writeRootWorkstationInfo();
    } catch (err) {
      alertError('工作站错误', err.message);
      return {
        data: {
          status: 'error'
        }
      };
    }

    return {
      data: {
        status: 'success'
      }
    };
  }
}

export function mountIPC() {
  // initial all ipc process to recieve message from renderer

  // Superintendent listens
  ipcMain.on('render-to-main', listener);

  ipcMain.handle('render-to-main-to-render', handler);
}
