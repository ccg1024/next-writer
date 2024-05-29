import fs from 'fs'
import {
  FileState,
  FrontMatter,
  RootWorkstationFolderInfo,
  RootWorkstationInfo
} from '_types'
import { writeDefaultConfig } from './file_process'

type MessageType = 'info' | 'error'
export function formatedMessage(msg: string, type: MessageType): string {
  if (type === 'info') {
    return `[INFO] ${msg}`
  } else if (type === 'error') {
    return `[ERROR] ${msg}`
  }
}

export function getDefaultAppDirectory() {
  const home = process.env.HOME || process.env.USERPROFILE
  const configDir = `${home}/.config/nwriter`
  const logDir = `${home}/.local/state/nwriter`
  const winConfig = `${home}\\nwriter`
  const winLog = `${home}\\nwriter\\log`

  const config = process.platform === 'win32' ? winConfig : configDir
  const log = process.platform === 'win32' ? winLog : logDir

  if (!fs.existsSync(config)) {
    fs.mkdirSync(config, { recursive: true })
  }
  if (!fs.existsSync(log)) {
    fs.mkdirSync(log, { recursive: true })
  }
  writeDefaultConfig(config)
  return { config, log }
}

type UpdateWorkstationInfoType = 'file' | 'folder'
/**
 * Update global._next_writer_windowConfig.rootWorkplatformInfo
 * and .nwriter.info.json when write a file
 * Since front-matter is read from .nwriter.info.json and do not update during
 * update cache system or read/write system
 */
export function updateWorkstationInfoWithWrite(
  libraryFile: string,
  nextFrontMatter: Partial<FrontMatter>
) {
  if (!libraryFile) return

  const root = global._next_writer_windowConfig.root
  if (!root) {
    throw new Error(
      'The root is empty from updateWorkstationInfoWithWrite function'
    )
  }
  const relative = libraryFile.startsWith('.')
    ? libraryFile.substring(2)
    : libraryFile.substring(root.length + 1)
  const pathlist = relative.split('/')
  recursiveUpdateWorkstationInfoWithWrite(
    pathlist,
    global._next_writer_windowConfig.rootWorkplatformInfo,
    nextFrontMatter
  )
}
export function recursiveUpdateWorkstationInfoWithWrite(
  pathlist: Array<string>,
  workstation: RootWorkstationInfo,
  nextFrontMatter: Partial<FrontMatter>
) {
  if (pathlist.length === 0) return

  const subpath = pathlist.shift()
  if (pathlist.length === 0) {
    // find library file info, final if
    let idx = -1
    for (let i = 0; i < workstation.files.length; i++) {
      if (workstation.files[i].name === subpath) {
        idx = i
        break
      }
    }
    if (idx === -1)
      throw new Error(
        `Cannot find file name: ${subpath} in recursiveUpdateWorkstationInfoWithWrite final if`
      )
    workstation.files[idx] = {
      ...workstation.files[idx],
      ...nextFrontMatter,
      mtime: new Date().toString()
    }
  } else {
    const idx = findFolderName(workstation.folders, subpath)
    if (idx === -1)
      throw new Error(
        `Cannot find folder name: ${subpath} in recursiveUpdateWorkstationInfoWithWrite`
      )
    recursiveUpdateWorkstationInfoWithWrite(
      pathlist,
      workstation.folders[idx].subfolders,
      nextFrontMatter
    )
  }
}

export function findFolderIndex(
  folders: RootWorkstationFolderInfo[],
  target: string
) {
  for (let i = 0; i < folders.length; i++) {
    if (folders[i].name === target) return i
  }

  return -1
}
export function findFileIndex(files: FileState[], target: string) {
  for (let i = 0; i < files.length; i++) {
    if (files[i].name === target) return i
  }
  return -1
}

/**
 * Sync special item from rootWorkplatformInfo to stageWorkplatformInfo
 * normally invoke when save library file
 *
 * @param path A relative path, just like './test.md'
 */
export function syncWorkstationInfo(path: string) {
  if (!path.startsWith('.')) throw new Error('The path is not start with "."')
  const tokens = path.split('/')
  if (tokens[0] === '.') tokens.shift()
  let rootInfo = global._next_writer_windowConfig.rootWorkplatformInfo
  let stageInfo = global._next_writer_windowConfig.stageWorkplatformInfo
  for (let i = 0; i < tokens.length; i++) {
    if (i === tokens.length - 1) {
      const rootIdx = findFileIndex(rootInfo.files, tokens[i])
      if (rootIdx === -1) {
        throw new Error('Cannot find root-file in syncWorkstationInfo')
      }
      const stageIdx = findFileIndex(stageInfo.files, tokens[i])
      if (stageIdx === -1) {
        throw new Error('Cannot find stage-file in syncWorkstationInfo')
      }
      const bak = JSON.stringify(rootInfo.files[rootIdx])
      stageInfo.files[stageIdx] = { ...JSON.parse(bak) }
      stageInfo.files = [
        ...stageInfo.files.sort(
          (a, b) =>
            new Date(a.birthtime).valueOf() - new Date(b.birthtime).valueOf()
        )
      ]
      break
    }
    const rootIdx = findFolderIndex(rootInfo.folders, tokens[i])
    if (rootIdx === -1) {
      throw new Error('Cannot find root-folder in "syncWorkstationInfo"')
    }
    const stageIdx = findFolderIndex(stageInfo.folders, tokens[i])
    if (stageIdx === -1) {
      throw new Error('Cannot find stage-folder in "syncWorkstationInfo"')
    }
    rootInfo = rootInfo.folders[rootIdx].subfolders
    stageInfo = stageInfo.folders[stageIdx].subfolders
  }
}
/**
 * Add a new item to rootWorkplatformInfo or stageWorkplatformInfo,
 * normally, invoke it when add a library file.
 *
 * @param path A relative path, just like './test.md'
 */
export function addWorkstationInfo(
  workstation: RootWorkstationInfo,
  type: 'file' | 'folder',
  path: string
) {
  if (!path.startsWith('.')) throw new Error('The path is not start with "."')
  const tokens = path.split('/')
  if (tokens[0] === '.') tokens.shift()
  for (let i = 0; i < tokens.length; i++) {
    if (i === tokens.length - 1) {
      // last one
      const time = new Date()
      if (type == 'file') {
        workstation.files.push({
          name: tokens[i],
          mtime: time.toString(),
          birthtime: time.toString()
        })
      } else {
        workstation.folders.push({
          name: tokens[i],
          subfolders: {
            files: [],
            folders: []
          },
          birthtime: new Date().toString()
        })
      }
      break
    }
    const idx = findFolderIndex(workstation.folders, tokens[i])
    if (idx === -1) {
      throw new Error('Cannot find folder name in "addWorkstationInfo"')
    }
    workstation = workstation.folders[idx].subfolders
  }
}
/**
 * Update global._next_writer_windowConfig.rootWorkplatformInfo,
 * which item not exist in rootWorkplatformInfo
 */
export function updateWorkstationInfo(
  path: string,
  type: UpdateWorkstationInfoType
) {
  if (!path) return

  const subpath = path.startsWith('./') ? path.substring(2) : path

  const pathlist = subpath.split('/')
  recursiveUpdateWorkstationInfo(
    pathlist,
    global._next_writer_windowConfig.rootWorkplatformInfo,
    type
  )
}
function recursiveUpdateWorkstationInfo(
  pathlist: Array<string>,
  workstation: RootWorkstationInfo,
  type: UpdateWorkstationInfoType
) {
  if (pathlist.length === 0) return

  const subpath = pathlist.shift()
  if (pathlist.length === 0) {
    const time = new Date()
    // update
    type === 'file'
      ? workstation.files.push({
          name: subpath,
          mtime: time.toString(),
          birthtime: time.toString()
        })
      : workstation.folders.push({
          name: subpath,
          subfolders: {
            files: [],
            folders: []
          },
          birthtime: new Date().toString()
        })
  } else {
    const idx = findFolderName(workstation.folders, subpath)
    if (idx === -1)
      throw new Error(
        'Cannot find folder name: ' +
          subpath +
          ' in recursiveUpdateWorkstationInfo'
      )

    recursiveUpdateWorkstationInfo(
      pathlist,
      workstation.folders[idx].subfolders,
      type
    )
  }
}
function findFolderName(
  folders: Array<RootWorkstationFolderInfo>,
  folder: string
) {
  let idx = -1
  for (let i = 0; i < folders.length; i++) {
    if (folders[i].name === folder) {
      idx = i
      break
    }
  }

  return idx
}

export function getRelativePath(path: string) {
  const root = global._next_writer_windowConfig.root
  if (!root) {
    throw new Error('root is empty in getRelativePath')
  }
  if (path.startsWith('.')) return path

  return `./${path.substring(root.length + 1)}`
}
