import { app } from 'electron'
import type {
  MenuItemConstructorOptions,
  MenuItem,
  BrowserWindow,
  KeyboardEvent
} from 'electron'
import { ipcChannel } from '../../config/ipc'
import {
  EditorChannel,
  HomeChannel,
  TypeWriterIpcValue
} from '../../types/common.d'
import { handleOpenFile, openImageFileProcess } from '../file_process'

// menu callback
async function editorTypewriter(
  menuItem: MenuItem,
  win: BrowserWindow,
  _event: KeyboardEvent
) {
  if (!win) return
  win.webContents.send(ipcChannel['main-to-render'].editor_component, {
    type: 'typewriter',
    value: {
      checked: menuItem.checked
    } as TypeWriterIpcValue
  } as EditorChannel)
}

async function openFile(_: unknown, win: BrowserWindow) {
  const readFileIpcValue = await handleOpenFile(win)

  const editorChannelValue: EditorChannel = {
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
  } as EditorChannel)
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
    value: imgPath
  } as EditorChannel)
}

async function toggleSideBar(
  menuItem: MenuItem,
  win: BrowserWindow,
  _: unknown
) {
  if (!win) return

  win.webContents.send(ipcChannel['main-to-render'].home_component, {
    type: 'hideSidebar',
    value: {
      checked: menuItem.checked
    }
  } as HomeChannel)
  win.setWindowButtonVisibility(!menuItem.checked)
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
          label: 'hide sidebar',
          click: toggleSideBar,
          type: 'checkbox',
          checked: false,
          accelerator: isMac ? 'Cmd+Shift+s' : 'Ctrl+Shift+s'
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
          checked: false
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
