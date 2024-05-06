import fs from 'fs'
import { RootWorkstationFolderInfo, RootWorkstationInfo } from '_types'
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
    // update
    type === 'file'
      ? workstation.files.push(subpath)
      : workstation.folders.push({
          name: subpath,
          subfolders: {
            files: [],
            folders: []
          }
        })
  } else {
    const idx = findFolderName(workstation.folders, subpath)
    if (idx === -1) throw new Error('Cannot find folder name: ' + subpath)

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
