// Handle file operation.

import { BrowserWindow, dialog, OpenDialogOptions } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { addCache, exitCache, getCache } from './cache'
import { ReadFileIpcValue } from '_common_type'

/**
 * Unifiling file path between windows system and macos/linux system
 *
 * @param filePath A string value of file path
 * @returns A formatted file path
 */
export function unifiledFilePath(filePath: string) {
  return filePath.split(path.sep).join(path.posix.sep)
}

/**
 * Using system dialog to show message for open file
 *
 * @param win A BrowserWindow, seen as dialog parent
 * @param opts Open dialog options
 * @returns filePath String type, for open file
 */
export async function openFileProcess(
  win: BrowserWindow,
  opts?: OpenDialogOptions
): Promise<string | null> {
  // using dialog to select a file
  const { canceled, filePaths } = await dialog.showOpenDialog(win, opts)

  if (canceled) return null

  return unifiledFilePath(filePaths[0])
}

/**
 * Using system dialog to select a markdown file
 *
 * @param win BrowserWindow
 * @returns markdown file path
 */
export async function openMarkdownFileProcess(
  win: BrowserWindow
): Promise<string | null> {
  return openFileProcess(win, {
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })
}

/**
 * Using system dialog to select a image file
 *
 * @param win BrowserWindow
 * @returns image file path
 */
export async function openImageFileProcess(win: BrowserWindow) {
  return openFileProcess(win, {
    filters: [{ name: 'Image', extensions: ['jpg', 'jpeg', 'gif', 'png'] }]
  })
}

/**
 * Using system dialog to show message for create a markdown file
 *
 * @param win A BrowserWindow, seen as dialog parent
 * @returns filePath String type, for create file
 */
export async function createFileProcess(
  win: BrowserWindow
): Promise<string | null> {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })

  if (canceled) return null

  return unifiledFilePath(filePath)
}

/**
 * Callback handle function, deal with open file option
 *
 * @param win Current BrowserWindow object
 * @returns A string value of file content or null if not select file
 */
export async function handleOpenFile(
  win: BrowserWindow
): Promise<ReadFileIpcValue | null> {
  const filePath = await openMarkdownFileProcess(win)
  if (!filePath) return null

  global._next_writer_windowConfig.workPlatform = filePath

  if (exitCache(filePath)) {
    const cache = getCache(filePath)
    return generateReadFileIpcValue(filePath, cache.content, cache.isChange)
  }

  return constructFileData(filePath)
}

/**
 * Construct a read file object, which used by read file ipc
 *
 * @param filePath A file path
 * @returns A object of type `ReadFileIpcValue`
 * */
export async function constructFileData(
  filePath: string
): Promise<ReadFileIpcValue> {
  const content = await fs.readFile(filePath, 'utf-8')
  // add cache
  addCache(filePath, {
    isChange: false,
    content
  })
  return generateReadFileIpcValue(filePath, content)
}

export function generateReadFileIpcValue(
  filePath: string,
  content: string,
  isChange = false
): ReadFileIpcValue {
  return {
    content: content,
    fileDescriptor: generateFileDescripter(filePath, isChange)
  }
}

export function generateFileDescripter(filePath: string, isChange = false) {
  return {
    isChange: isChange,
    path: filePath,
    name: path.basename(filePath, path.extname(filePath))
  }
}

/**
 * Create a virtual empty file
 *
 * @param win BrowserWindow
 * */
export async function handleCreateFile(win: BrowserWindow) {
  const filePath = await createFileProcess(win)

  if (!filePath) return

  global._next_writer_windowConfig.workPlatform = filePath
  return constructVirtualFileData(filePath)
}

export async function constructVirtualFileData(
  filePath: string
): Promise<ReadFileIpcValue> {
  addCache(filePath, {
    isChange: false,
    content: ''
  })
  return generateReadFileIpcValue(filePath, '')
}
