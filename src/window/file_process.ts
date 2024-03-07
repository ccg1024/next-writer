// Handle file operation.

import { BrowserWindow, dialog, OpenDialogOptions } from 'electron'
import path from 'path'
import fs from 'fs/promises'
import { ReadFileIpcValue } from '../types/common.d'

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

  global._next_writer_windowConfig.workPlatform = path.dirname(filePath)

  return {
    content: await fs.readFile(filePath, 'utf-8'),
    fileDescriptor: {
      isChange: false,
      path: filePath,
      name: path.basename(filePath, path.extname(filePath))
    }
  }
}
