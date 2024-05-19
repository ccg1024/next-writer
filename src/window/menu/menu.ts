import { app } from 'electron'
import type {
  MenuItemConstructorOptions,
  MenuItem,
  BrowserWindow,
  KeyboardEvent
} from 'electron'
import { ipcChannel } from 'src/config/ipc'
import {
  handleCreateFile,
  handleOpenFile,
  openImageFileProcess,
  synchronizeFileTree,
  writeRootWorkstationInfo
} from '../file_process'
import { IpcChannelData } from '_types'
import { handleToggleHeadNav, handleToggleSidebar } from './menu-callback'

// menu callback
async function editorTypewriter(
  menuItem: MenuItem,
  win: BrowserWindow,
  _event: KeyboardEvent
) {
  if (!win) return
  global._next_writer_windowConfig.renderConfig.typewriter = menuItem.checked
  win.webContents.send(ipcChannel['main-to-render'].editor_component, {
    type: 'typewriter',
    value: {
      checked: menuItem.checked
    }
  } as IpcChannelData)
}

async function openFile(_: unknown, win: BrowserWindow) {
  const readFileIpcValue = await handleOpenFile(win)

  const editorChannelValue: IpcChannelData = {
    type: 'readfile',
    value: readFileIpcValue
  }

  if (!readFileIpcValue) return

  win.webContents.send(
    ipcChannel['main-to-render'].editor_component,
    editorChannelValue
  )
}

async function saveFile(_: unknown, win: BrowserWindow) {
  win.webContents.send(ipcChannel['main-to-render'].editor_component, {
    type: 'writefile',
    value: {}
  } as IpcChannelData)
}

async function createFile(_: unknown, win: BrowserWindow) {
  const readFileIpcValue = await handleCreateFile(win)

  if (!readFileIpcValue) return

  const editorChannelValue: IpcChannelData = {
    type: 'readfile',
    value: readFileIpcValue
  }

  win.webContents.send(
    ipcChannel['main-to-render'].editor_component,
    editorChannelValue
  )
}

async function insertImage(
  _m: MenuItem,
  win: BrowserWindow,
  _e: KeyboardEvent
) {
  const imgPath = await openImageFileProcess(win)

  if (!imgPath) return

  win.webContents.send(ipcChannel['main-to-render'].editor_component, {
    type: 'insertImage',
    value: {
      imgPath
    }
  } as IpcChannelData)
}

function toggleSideBar(_m: MenuItem, win: BrowserWindow, _: unknown) {
  handleToggleSidebar(win)
}

function toggleHeadNav(_m: MenuItem, win: BrowserWindow, _: unknown) {
  handleToggleHeadNav(win)
}

function toggleFocusMode(m: MenuItem, win: BrowserWindow) {
  if (!win) return

  global._next_writer_windowConfig.renderConfig.focusMode = m.checked
  win.webContents.send(ipcChannel['main-to-render'].home_component, {
    type: 'focusMode',
    value: {
      checked: m.checked
    }
  } as IpcChannelData)
}

function preview(_m: MenuItem, win: BrowserWindow) {
  if (!win) return

  const oldValue = !!global._next_writer_windowConfig.menuStatus.preview
  win.webContents.send(ipcChannel['main-to-render'].home_component, {
    type: 'preview',
    value: {
      checked: !oldValue
    }
  } as IpcChannelData)
  global._next_writer_windowConfig.menuStatus.preview = !oldValue
  global._next_writer_windowConfig.menuStatus.livePreview = false
}

function livePreview(_m: MenuItem, win: BrowserWindow) {
  if (!win) return

  const oldValue = !!global._next_writer_windowConfig.menuStatus.livePreview
  win.webContents.send(ipcChannel['main-to-render'].home_component, {
    type: 'livePreview',
    value: {
      checked: !oldValue
    }
  } as IpcChannelData)
  global._next_writer_windowConfig.menuStatus.livePreview = !oldValue
  global._next_writer_windowConfig.menuStatus.preview = false
}

function syncWorkplatform(_: MenuItem, win: BrowserWindow) {
  if (!win) return

  // send a empty message
  win.webContents.send(ipcChannel['main-to-render'].sidebar_component, {
    type: 'sidebar-sync-file-tree',
    value: { manualStatus: 'pending' }
  } as IpcChannelData)

  synchronizeFileTree()
    .then(fileTree => {
      // update global variable
      global._next_writer_windowConfig.rootWorkplatformInfo = fileTree
      writeRootWorkstationInfo()
        .then(() => {
          win.webContents.send(ipcChannel['main-to-render'].sidebar_component, {
            type: 'sidebar-sync-file-tree',
            value: { ...fileTree, manualStatus: 'fulfilled' }
          } as IpcChannelData)
        })
        .catch(err => {
          throw err
        })
    })
    .catch(err => {
      win.webContents.send(ipcChannel['main-to-render'].sidebar_component, {
        type: 'sidebar-sync-file-tree',
        value: { manualStatus: 'rejected', err }
      } as IpcChannelData)
      throw new err()
    })
}

export default function createMenus(): MenuItemConstructorOptions[] {
  // const appname = app.name
  const isMac = process.platform === 'darwin'

  return [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              {
                label: 'sync workplatform',
                click: syncWorkplatform
              },
              { type: 'separator' },
              { role: 'quit' }
            ] as MenuItemConstructorOptions[]
          }
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'open file',
          click: openFile,
          accelerator: isMac ? 'Cmd+o' : 'Ctrl+o'
        },
        {
          label: 'save file',
          click: saveFile,
          accelerator: isMac ? 'Cmd+s' : 'Ctrl+s'
        },
        {
          label: 'creat file',
          click: createFile,
          accelerator: isMac ? 'Cmd+n' : 'Ctrl+n'
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'toggle sidebar',
          click: toggleSideBar,
          accelerator: isMac ? 'Cmd+Shift+s' : 'Ctrl+Shift+s'
        },
        {
          label: 'toggle headNav',
          click: toggleHeadNav,
          accelerator: isMac ? 'Cmd+Shift+h' : 'Ctrl+Shift+h'
        },
        {
          label: 'toggle preview',
          click: preview,
          accelerator: isMac ? 'Cmd+Shift+p' : 'Ctrl+Shift+p'
        },
        {
          label: 'live preview',
          click: livePreview
        },
        {
          label: 'focus mode',
          click: toggleFocusMode,
          type: 'checkbox',
          checked: !!global._next_writer_windowConfig.renderConfig.focusMode
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        {
          label: 'typewriter',
          click: editorTypewriter,
          type: 'checkbox',
          checked: !!global._next_writer_windowConfig.renderConfig.typewriter
        },
        { type: 'separator' },
        { label: 'insert image', click: insertImage }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }]
    }
  ]
}
