// Making comunication with rederer process

import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import fs from 'fs'
import path from 'path'
import { ipcChannel } from '../config/ipc'
import {
  generateReadFileIpcValue,
  constructFileData,
  createFileProcess,
  generateFileDescripter,
  writeRootWorkstationInfo
} from './file_process'
import { exitCache, getCache, updateCache } from './cache'
import {
  AddFileBody,
  EditorChannel,
  // InvokeInfoType,
  IpcRequestData,
  IpcResponseData
} from '_common_type'
import { CacheContent, UpdateCacheContent } from '_window_type'
import { formatedMessage, updateWorkstationInfo } from './utils'

async function handleOpenFileFromRenderer(_: unknown, filePath: string) {
  // check whether have cache
  let readFileIpcValue = null
  if (exitCache(filePath)) {
    const cache = getCache(filePath)
    readFileIpcValue = generateReadFileIpcValue(
      filePath,
      cache.content,
      cache.isChange
    )
  } else {
    readFileIpcValue = await constructFileData(filePath)
  }
  global._next_writer_windowConfig.workPlatform = filePath
  global._next_writer_windowConfig.win.webContents.send(
    ipcChannel['main-to-render'].editor_component,
    {
      type: 'readfile',
      value: readFileIpcValue
    } as EditorChannel
  )
}

function handleUpdateCache(
  _e: unknown,
  update: Partial<CacheContent> & { filePath: string }
) {
  if (!update) return

  const { filePath, ...cache } = update

  updateCache(filePath, cache)
}

async function handleSave(_: unknown, content: string) {
  // save file

  // if not mount file path, open dialog to create a file path
  if (global._next_writer_windowConfig.workPlatform == '') {
    const newFile = await createFileProcess(
      global._next_writer_windowConfig.win
    )
    if (!newFile) return

    global._next_writer_windowConfig.workPlatform = newFile
    // notify renderer to show new file information.
    global._next_writer_windowConfig.win.webContents.send(
      ipcChannel['main-to-render'].sidebar_component,
      generateFileDescripter(newFile)
    )
  }

  const filePath = global._next_writer_windowConfig.workPlatform
  updateCache(filePath, {
    isChange: false,
    content: content
  })

  const writeStream = fs.createWriteStream(filePath, {
    encoding: 'utf-8'
  })
  writeStream.write(content)
  writeStream.end()
  writeStream.on('finish', () => {
    // some code for file lock
  })
}

// In invoke handle, type: read-current-workstation
// async function handleInvokeGetInfo(
//   _e: IpcMainInvokeEvent,
//   type: InvokeInfoType
// ) {
//   if (type === 'workstation') {
//     return global._next_writer_windowConfig.workPlatform
//   }
// }

async function listener(_e: IpcMainEvent, req: IpcRequestData) {
  if (!req) return

  // From filesystem components
  if (req.type === 'open-file') {
    let readFileIpcValue = null
    const filePath = req.data.filePath as string
    if (!filePath) throw new Error('The request data prop `filePath` is empty.')
    const root = global._next_writer_windowConfig.root
    const fullpath = filePath.startsWith('./')
      ? path.resolve(root, filePath)
      : filePath

    if (exitCache(fullpath)) {
      const cache = getCache(fullpath)
      readFileIpcValue = generateReadFileIpcValue(
        fullpath,
        cache.content,
        cache.isChange
      )
    } else {
      readFileIpcValue = await constructFileData(fullpath)
    }
    global._next_writer_windowConfig.workPlatform = fullpath
    global._next_writer_windowConfig.win.webContents.send(
      ipcChannel['main-to-render'].editor_component,
      {
        type: 'readfile',
        value: readFileIpcValue
      } as EditorChannel
    )
  } else if (req.type === 'open-recent-file') {
    // From filelist components open recent file
    const filePath = <string>req.data.filePath
    if (filePath) handleOpenFileFromRenderer(null, filePath)
  } else if (req.type === 'update-cache') {
    const update = <UpdateCacheContent>req.data
    handleUpdateCache(null, update)
  } else if (req.type === 'save-file') {
    const content = req.data.content
    if (typeof content === 'string') handleSave(null, content)
  }
}

async function handler(
  _e: IpcMainInvokeEvent,
  req: IpcRequestData
): Promise<IpcResponseData> {
  if (!req) return

  const root = global._next_writer_windowConfig.root

  if (!root) throw formatedMessage('The root dir is empty', 'error')

  if (req.type === 'add-file-from-render') {
    // Add a new file/folder to root dir

    const reqBody = req.data as AddFileBody

    const subpath =
      reqBody.option === 'file' ? reqBody.path + '.md' : reqBody.path

    const fullpath = path.resolve(root, subpath)

    // check whether path exist
    if (fs.existsSync(fullpath)) {
      throw formatedMessage(`The path: ${fullpath} already exists.`, 'error')
    }

    // update memo workstation info
    updateWorkstationInfo(subpath, reqBody.option)
    await writeRootWorkstationInfo().catch(err => {
      throw err
    })
    if (reqBody.option === 'file') {
      // If not, create a empty file.
      await fs.promises.writeFile(fullpath, '').catch(err => {
        throw err
      })
    } else {
      // Create a folder
      await fs.promises.mkdir(fullpath, { recursive: true }).catch(err => {
        throw err
      })
    }

    return {
      data: 'success'
    }
  } else if (req.type === 'read-root-workplatform-info') {
    return {
      data: global._next_writer_windowConfig.rootWorkplatformInfo
    }
  } else if (req.type === 'read-current-workstation') {
    return {
      data: global._next_writer_windowConfig.workPlatform
    }
  } else if (req.type === 'read-render-config') {
    return {
      data: global._next_writer_windowConfig.renderConfig
    }
  }
}

export function mountIPC() {
  // initial all ipc process to recieve message from renderer
  // ipcMain.on(
  //   ipcChannel['render-to-main']._render_open_file,
  //   handleOpenFileFromRenderer
  // )
  // ipcMain.on(
  //   ipcChannel['render-to-main']._render_update_cache,
  //   handleUpdateCache
  // )

  // ipcMain.on(ipcChannel['render-to-main']._render_save_file, handleSave)

  // Superintendent listens
  ipcMain.on('render-to-main', listener)

  // handle invoke ipc
  // ipcMain.handle(
  //   ipcChannel['invoke-channel']._invoke_get_info,
  //   handleInvokeGetInfo
  // )

  ipcMain.handle('render-to-main-to-render', handler)
}
