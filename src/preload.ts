// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { ipcChannel } from './config/ipc'

type CallbackFunction = (event: IpcRendererEvent, ...args: unknown[]) => void

// Expose protected methods that allow the renderer process to use
contextBridge.exposeInMainWorld('ipc', {
  // just recieve message from main process
  listenEditorChannel: (cb: CallbackFunction) => {
    ipcRenderer.on(ipcChannel['main-to-render'].editor_component, cb)

    return () => {
      ipcRenderer.removeListener(
        ipcChannel['main-to-render'].editor_component,
        cb
      )
    }
  },
  listenHomeChannel: (cb: CallbackFunction) => {
    ipcRenderer.on(ipcChannel['main-to-render'].home_component, cb)

    return () => {
      ipcRenderer.removeListener(
        ipcChannel['main-to-render'].home_component,
        cb
      )
    }
  }
})
