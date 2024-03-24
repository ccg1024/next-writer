import { dialog, BrowserWindow } from 'electron'

export function alertInfo(msg: string, win: BrowserWindow) {
  return dialog.showMessageBoxSync(win, {
    type: 'warning',
    title: 'Warning Info',
    message: msg,
    buttons: ['Yes', 'No'],
    cancelId: 1
  })
}
