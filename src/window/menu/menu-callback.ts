import { BrowserWindow } from 'electron'
import { ipcChannel } from 'src/config/ipc'
import { IpcChannelData } from '_types'

export function handleToggleMideBar(win: BrowserWindow) {
  if (!win) return

  const oldValue = !!global._next_writer_windowConfig.menuStatus.mideBarVisible
  win.webContents.send(ipcChannel['main-to-render'].home_component, {
    type: 'toggleMidebar',
    value: {
      checked: !oldValue
    }
  })
  global._next_writer_windowConfig.menuStatus.mideBarVisible = !oldValue
}
export function handleToggleSidebar(win: BrowserWindow) {
  if (!win) return

  const oldValue = !!global._next_writer_windowConfig.menuStatus.sideBarVisible

  win.webContents.send(ipcChannel['main-to-render'].home_component, {
    type: 'toggleSidebar',
    value: {
      checked: !oldValue
    }
  } as IpcChannelData)
  // win.setWindowButtonVisibility(!oldValue)
  //
  // if (win.isFullScreen()) {
  //   win.setWindowButtonVisibility(true)
  // }
  global._next_writer_windowConfig.menuStatus.sideBarVisible = !oldValue
}

export function handleToggleHeadNav(win: BrowserWindow) {
  if (!win) return

  const oldValue = !!global._next_writer_windowConfig.menuStatus.hideNavVisible
  win.webContents.send(ipcChannel['main-to-render'].home_component, {
    type: 'toggleHeadNav',
    value: {
      checked: !oldValue
    }
  } as IpcChannelData)
  global._next_writer_windowConfig.menuStatus.hideNavVisible = !oldValue
}

export function handleToggleFloatMenu(win: BrowserWindow) {
  if (!win) return

  const oldValue =
    !!global._next_writer_windowConfig.menuStatus.floatMenuVisible
  win.webContents.send(ipcChannel['main-to-render'].home_component, {
    type: 'toggleFloatMenu',
    value: {
      checked: !oldValue
    }
  } as IpcChannelData)
  global._next_writer_windowConfig.menuStatus.floatMenuVisible = !oldValue
}
