// Handle file operation.

import { BrowserWindow, dialog, OpenDialogOptions } from 'electron'
import path from 'path'
import fs from 'fs'
import { addCache, exitCache, getCache } from './cache'
import { ReadFileDescriptor, RootWorkstationInfo } from '_types'

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
): Promise<ReadFileDescriptor | null> {
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
): Promise<ReadFileDescriptor> {
  const content = await fs.promises.readFile(filePath, 'utf-8')
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
): ReadFileDescriptor {
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
): Promise<ReadFileDescriptor> {
  addCache(filePath, {
    isChange: false,
    content: ''
  })
  return generateReadFileIpcValue(filePath, '')
}

export function writeDefaultConfig(configPath: string) {
  // if there not any config file,
  // this function will write default config file throw
  // to default config path
  const configName = 'nwriter.json'
  const fullpath = path.resolve(configPath, configName)
  const home = process.env.HOME || process.env.USERPROFILE
  const defaultConfig = {
    root: `${home}/documents/nwriter`
  }
  if (!fs.existsSync(fullpath)) {
    fs.writeFileSync(fullpath, JSON.stringify(defaultConfig))
  }
}

export function readConfig(configPath: string) {
  if (!fs.existsSync(configPath)) {
    throw new Error('The config file do not exist!!!')
  }
  const config = fs.readFileSync(configPath, { encoding: 'utf-8' })

  return JSON.parse(config)
}

export function initialRootWorkplatform() {
  const root = global._next_writer_windowConfig.root

  if (!root) {
    throw new Error(
      'The root dir path is empty, did `initialRootWorkplatform` function place wrong way?'
    )
  }

  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true })
  }
}

export function readRootWorkstationInfo() {
  const root = global._next_writer_windowConfig.root
  const infoFileName = '.nwriter.info.json'
  const infoPath = path.resolve(root, infoFileName)

  if (!root) {
    throw new Error(
      'The root dir path is empty, did `readRootWorkstationInfo` function place right way?'
    )
  }
  if (!fs.existsSync(infoPath)) {
    const emptyInfo: RootWorkstationInfo = {
      folders: [],
      files: []
    }
    fs.promises.writeFile(infoPath, JSON.stringify(emptyInfo)).catch(err => {
      throw err
    })
  } else {
    fs.promises
      .readFile(infoPath)
      .then(value => {
        const info = JSON.parse(value.toString('utf8')) as RootWorkstationInfo
        global._next_writer_windowConfig.rootWorkplatformInfo = { ...info }
      })
      .catch(err => {
        throw err
      })
  }
}

export async function writeRootWorkstationInfo() {
  const root = global._next_writer_windowConfig.root
  const infoFileName = '.nwriter.info.json'
  const infoPath = path.resolve(root, infoFileName)

  if (!root) {
    throw new Error(
      'The root dir path is empty, did `writeRootWorkstationInfo` function place right way?'
    )
  }

  const infoData = global._next_writer_windowConfig.rootWorkplatformInfo
  fs.promises.writeFile(infoPath, JSON.stringify(infoData)).catch(err => {
    throw err
  })
}
