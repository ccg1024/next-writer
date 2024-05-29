// Handle file operation.

import matter from 'gray-matter'
import { BrowserWindow, dialog, OpenDialogOptions } from 'electron'
import path from 'path'
import fs from 'fs'
import { addCache, exitCache, getCache } from './cache'
import {
  FileDescriptor,
  FileState,
  ReadFileDescriptor,
  RootWorkstationFolderInfo,
  RootWorkstationInfo
} from '_types'
import { addWorkstationInfo } from './utils'

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
  const gray = matter(content)
  return {
    frontMatter: gray.data,
    content: gray.content,
    fileDescriptor: generateFileDescripter(filePath, isChange)
  }
}

export function generateFileDescripter(
  filePath: string,
  isChange = false
): FileDescriptor {
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
        const stageInfo = JSON.parse(
          value.toString('utf8')
        ) as RootWorkstationInfo
        global._next_writer_windowConfig.rootWorkplatformInfo = { ...info }
        global._next_writer_windowConfig.stageWorkplatformInfo = stageInfo
      })
      .catch(err => {
        throw err
      })
  }
}

/**
 * Write global._next_writer_windowConfig.rootWorkplatformInfo
 * into .nwriter.info.json of next-wirter root folder
 */
export async function writeRootWorkstationInfo() {
  const root = global._next_writer_windowConfig.root
  const infoFileName = '.nwriter.info.json'
  const infoPath = path.resolve(root, infoFileName)

  if (!root) {
    throw new Error(
      'The root dir path is empty, did `writeRootWorkstationInfo` function place right way?'
    )
  }
  const stageInfo = global._next_writer_windowConfig.stageWorkplatformInfo
  fs.promises
    .writeFile(infoPath, JSON.stringify(stageInfo, null, 2))
    .catch(err => {
      throw err
    })
}

/**
 * Synchronize file tree, return a promise
 */
export function synchronizeFileTree() {
  const fileTree: RootWorkstationInfo = {
    folders: [],
    files: []
  }

  const root = global._next_writer_windowConfig.root

  if (!root) return Promise.reject('root path is empty')

  return asyncFileTree(root, fileTree)
}

async function asyncFileTree(root: string, cache: RootWorkstationInfo) {
  const files = await fs.promises.readdir(root)
  const folders: Array<RootWorkstationFolderInfo> = []
  const _files: Array<FileState> = []

  for await (const file of files) {
    const fullpath = path.resolve(root, file)
    const stats = await fs.promises.stat(fullpath)

    if (stats.isDirectory()) {
      if (file.startsWith('.')) continue
      const tempFolders: RootWorkstationFolderInfo = {
        name: file,
        subfolders: {
          folders: [],
          files: []
        },
        birthtime: stats.birthtime.toString()
      }
      await asyncFileTree(fullpath, tempFolders.subfolders)
      folders.push(tempFolders)
    } else {
      if (file.startsWith('.')) continue
      const content = await fs.promises.readFile(fullpath)
      const frontMatter = matter(content)
      const description =
        frontMatter.content.length > 100
          ? frontMatter.content.slice(0, 100)
          : frontMatter.content
      _files.push({
        name: file,
        mtime: stats.mtime.toString(),
        birthtime: stats.birthtime.toString(),
        tittle: frontMatter.data.title ?? '',
        description
      })
    }
  }

  cache.folders = folders.sort(
    (a, b) => new Date(a.birthtime).valueOf() - new Date(b.birthtime).valueOf()
  )
  cache.files = _files.sort(
    (a, b) => new Date(a.birthtime).valueOf() - new Date(b.birthtime).valueOf()
  )

  return Promise.resolve(cache)
}

// NOTE: 关于应用打包后，访问文件夹权限问题，通过showOpenDialogSync
// 方式确认后就能够解决，一旦确认一次就一直能够访问
// 不知道使用showMessageBoxSync方法能不能够解决，UI上这个弹窗更好
export function havePermissionToRoot(win: BrowserWindow) {
  const root = global._next_writer_windowConfig.root
  try {
    fs.readdirSync(root + '/')
    dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: ['No', 'Yes'],
      defaultId: 1,
      message: '允许next-wirter访问文稿?',
      title: '访问权限',
      cancelId: 0
    })
  } catch (_err) {
    dialog.showOpenDialogSync(win, {
      defaultPath: root,
      properties: ['openDirectory'],
      message: 'open root dir?'
    })
    dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: ['No', 'Yes'],
      defaultId: 1,
      message: '允许next-wirter访问文稿?',
      title: '访问权限',
      cancelId: 0
    })
  }
}

/**
 * Add a new file to local library, which store at root
 *
 * @param library The path of library to where add a new file
 */
export function addLibraryFile(library: string) {
  const timestamp = new Date().valueOf()
  // the mathod path.join('./', 'a.md') -> a.md
  const newFilePath = path.join(library, `${timestamp.toString()}.md`)
  const root = global._next_writer_windowConfig.root
  if (!root) {
    throw new Error('The root is empty at addLibraryFile function')
  }
  const fullpathOfNewFile = path.join(root, newFilePath)
  fs.writeFileSync(fullpathOfNewFile, '')

  // update rootWorkplatformInfo
  // update item that not exist
  // updateWorkstationInfo(newFilePath, 'file')
  const relative = newFilePath.startsWith('.')
    ? newFilePath
    : `./${newFilePath}`
  addWorkstationInfo(
    global._next_writer_windowConfig.rootWorkplatformInfo,
    'file',
    relative
  )
  addWorkstationInfo(
    global._next_writer_windowConfig.stageWorkplatformInfo,
    'file',
    relative
  )
  writeRootWorkstationInfo().catch(err => {
    throw err
  })
  return relative
}

/**
 * Add a new library to local
 *
 * @param library The new library path, start with '.'
 */
export function addLibrary(library: string) {
  const root = global._next_writer_windowConfig.root
  if (!root) {
    throw new Error('the root is empty at addLibrary function')
  }
  const fullLibraryPath = path.resolve(root, library)
  if (fs.existsSync(fullLibraryPath)) {
    return -1
  }
  fs.mkdirSync(fullLibraryPath, { recursive: true })

  // updateWorkstationInfo(library, 'folder')
  addWorkstationInfo(
    global._next_writer_windowConfig.rootWorkplatformInfo,
    'folder',
    library
  )
  addWorkstationInfo(
    global._next_writer_windowConfig.stageWorkplatformInfo,
    'folder',
    library
  )
  writeRootWorkstationInfo().catch(err => {
    throw err
  })
}
