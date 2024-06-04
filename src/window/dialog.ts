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

export function warnInfo(msg: string, win: BrowserWindow) {
  return dialog.showMessageBox(win, {
    type: 'warning',
    buttons: ['否', '是'],
    defaultId: 1,
    message: msg,
    cancelId: 0
  })
}
export function alertError(title: string, content: string) {
  return dialog.showErrorBox(title, content)
}
