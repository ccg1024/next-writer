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

async function _openFile(_: unknown, win: BrowserWindow) {
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

async function _createFile(_: unknown, win: BrowserWindow) {
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
  // win.webContents.send(ipcChannel['main-to-render'].sidebar_component, {
  //   type: 'sidebar-sync-file-tree',
  //   value: { manualStatus: 'pending' }
  // } as IpcChannelData)

  synchronizeFileTree()
    .then(fileTree => {
      // update global variable
      const temp = JSON.stringify(fileTree)
      global._next_writer_windowConfig.rootWorkplatformInfo = JSON.parse(temp)
      global._next_writer_windowConfig.stageWorkplatformInfo = JSON.parse(temp)
      writeRootWorkstationInfo()
        .then(() => {
          // win.webContents.send(ipcChannel['main-to-render'].sidebar_component, {
          //   type: 'sidebar-sync-file-tree',
          //   value: { ...fileTree, manualStatus: 'fulfilled' }
          // } as IpcChannelData)
          app.relaunch()
          app.exit()
        })
        .catch(err => {
          throw err
        })
    })
    .catch(err => {
      // win.webContents.send(ipcChannel['main-to-render'].sidebar_component, {
      //   type: 'sidebar-sync-file-tree',
      //   value: { manualStatus: 'rejected', err }
      // } as IpcChannelData)
      throw err
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
              { role: 'about', label: '关于' },
              { type: 'separator' },
              { role: 'services', label: '服务' },
              { type: 'separator' },
              {
                label: '同步库',
                click: syncWorkplatform
              },
              { type: 'separator' },
              { role: 'quit', label: '关闭' }
            ] as MenuItemConstructorOptions[]
          }
        ]
      : []),
    {
      label: '文件',
      submenu: [
        // {
        //   label: 'open file',
        //   click: openFile,
        //   accelerator: isMac ? 'Cmd+o' : 'Ctrl+o'
        // },
        {
          label: '保存',
          click: saveFile,
          accelerator: isMac ? 'Cmd+s' : 'Ctrl+s'
        }
        // {
        //   label: 'creat file',
        //   click: createFile,
        //   accelerator: isMac ? 'Cmd+n' : 'Ctrl+n'
        // },
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'toggleDevTools', label: '调试' },
        { type: 'separator' },
        {
          label: '侧边栏',
          click: toggleSideBar,
          accelerator: isMac ? 'Cmd+Shift+s' : 'Ctrl+Shift+s'
        },
        {
          label: '切换导航',
          click: toggleHeadNav,
          accelerator: isMac ? 'Cmd+Shift+h' : 'Ctrl+Shift+h'
        },
        {
          label: '切换预览',
          click: preview,
          accelerator: isMac ? 'Cmd+Shift+p' : 'Ctrl+Shift+p'
        },
        {
          label: '实时预览',
          click: livePreview
        },
        {
          label: '专注模式',
          click: toggleFocusMode,
          type: 'checkbox',
          checked: !!global._next_writer_windowConfig.renderConfig.focusMode
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { type: 'separator' },
        {
          label: '打字机模式',
          click: editorTypewriter,
          type: 'checkbox',
          checked: !!global._next_writer_windowConfig.renderConfig.typewriter
        },
        { type: 'separator' },
        { label: '插入图片', click: insertImage }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '最大化' }
      ]
    }
  ]
}
