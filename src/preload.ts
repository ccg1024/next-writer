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
  },

  _render_openFile: (filePath: string) => {
    ipcRenderer.send(ipcChannel['render-to-main']._render_open_file, filePath)
  },
  _render_updateCache: (cache: unknown) => {
    ipcRenderer.send(ipcChannel['render-to-main']._render_update_cache, cache)
  },
  _render_saveFile: (content: string) => {
    ipcRenderer.send(ipcChannel['render-to-main']._render_save_file, content)
  }
})
