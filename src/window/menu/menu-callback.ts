import { BrowserWindow } from 'electron'
import { ipcChannel } from 'src/config/ipc'
import { IpcChannelData } from '_types'

export function handleToggleSidebar(win: BrowserWindow) {
  if (!win) return

  const oldValue = !!global._next_writer_windowConfig.menuStatus.sideBarVisible

  win.webContents.send(ipcChannel['main-to-render'].home_component, {
    type: 'toggleSidebar',
    value: {
      checked: !oldValue
    }
  } as IpcChannelData)
  win.setWindowButtonVisibility(!oldValue)

  if (win.isFullScreen()) {
    win.setWindowButtonVisibility(true)
  }
  global._next_writer_windowConfig.menuStatus.sideBarVisible = !oldValue
}
