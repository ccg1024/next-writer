// Making comunication with rederer process

import { ipcMain } from 'electron'
import { ipcChannel } from '../config/ipc'
import { generateReadFileIpcValue, constructFileData } from './file_process'
import { EditorChannel } from '../types/common.d'
import { exitCache, getCache } from './cache'

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

export function mountIPC() {
  // initial all ipc process to recieve message from renderer
  ipcMain.on(
    ipcChannel['render-to-main']._render_open_file,
    handleOpenFileFromRenderer
  )
}
