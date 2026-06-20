// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import { IPC_CHANNEL, IPC_SERVER_NAME } from 'src/window/ipc/ipc-contract';
import { validateIpcRequest } from 'src/window/ipc/request-validator';

type CallbackFunction = (...args: unknown[]) => void;

function post(param: unknown) {
  const validation = validateIpcRequest(param);

  if (validation.valid === false) {
    return Promise.resolve({ status: -1, data: null, message: validation.message });
  }

  return ipcRenderer.invoke(IPC_SERVER_NAME, validation.request);
}

// Expose protected methods that allow the renderer process to use
contextBridge.exposeInMainWorld('ipc', {

  readConfig() {
    return post({ type: IPC_CHANNEL.READ_CONFIG });
  },

  readFile(data: unknown) {
    return post({ type: IPC_CHANNEL.READ_FILE, data });
  },

  updateLib(data: unknown) {
    return post({ type: IPC_CHANNEL.UPDATE_LIB, data });
  },

  writeFile(data: unknown) {
    return post({ type: IPC_CHANNEL.WRITE_FILE, data });
  },

  queryRuntimeConfig() {
    return post({ type: IPC_CHANNEL.RUNTIME });
  },

  updateCache(data: unknown) {
    return post({ type: IPC_CHANNEL.UPDATE_CACHE, data });
  },

  /**
   * Main to renderer, bidirectional channel
   */
  rendererListener: (cb: CallbackFunction) => {
    const listener = (_event: IpcRendererEvent, action: unknown) => cb(action);
    ipcRenderer.on('next-ipc-client', listener);

    return () => {
      ipcRenderer.removeListener('next-ipc-client', listener);
    };
  }
});
