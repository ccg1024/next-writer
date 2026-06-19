// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { Request } from '_types';
import { IPC_CHANNEL } from 'src/tools/config';

type CallbackFunction = (...args: unknown[]) => void;
const IPC_SERVER_NAME = 'next-ipc-server';
const ALLOWED_CHANNELS = new Set(Object.values(IPC_CHANNEL));

function post<T>(param: Request<T>) {
  if (!param || !ALLOWED_CHANNELS.has(param.type)) {
    return Promise.resolve({ status: -1, data: null, message: 'Invalid IPC channel.' });
  }

  return ipcRenderer.invoke(IPC_SERVER_NAME, param);
}

// Expose protected methods that allow the renderer process to use
contextBridge.exposeInMainWorld('ipc', {
  // IOC
  /**
   * Renderer to main bidirectional channel (mock http)
   * @deprecated Use explicit methods instead.
   */
  _post<T>(param: Request<T>) {
    return post(param);
  },

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
