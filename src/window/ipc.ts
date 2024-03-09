// Making comunication with rederer process

import { ipcMain } from 'electron'
import fs from 'fs'
import { ipcChannel } from '../config/ipc'
import { generateReadFileIpcValue, constructFileData } from './file_process'
import { EditorChannel } from '../types/common.d'
import { exitCache, getCache, updateCache } from './cache'
import { CacheContent } from '../types/window.d'

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
  if (global._next_writer_windowConfig.workPlatform == '') return

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
    // some code fot file lock
  })
}

export function mountIPC() {
  // initial all ipc process to recieve message from renderer
  ipcMain.on(
    ipcChannel['render-to-main']._render_open_file,
    handleOpenFileFromRenderer
  )
  ipcMain.on(
    ipcChannel['render-to-main']._render_update_cache,
    handleUpdateCache
  )

  ipcMain.on(ipcChannel['render-to-main']._render_save_file, handleSave)
}
