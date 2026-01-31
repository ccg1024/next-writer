// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { Request } from '_types';

type CallbackFunction = (event: IpcRendererEvent, ...args: unknown[]) => void;

// Expose protected methods that allow the renderer process to use
contextBridge.exposeInMainWorld('ipc', {
  // IOC
  /**
   * Renderer to main bidirectional channel (mock http)
   */
  _post<T>(param: Request<T>) {
    return ipcRenderer.invoke('next-ipc-server', param);
  },

  /**
   * Main to renderer, bidirectional channel
   */
  rendererListener: (cb: CallbackFunction) => {
    ipcRenderer.on('next-ipc-client', cb);

    return () => {
      ipcRenderer.removeListener('next-ipc-client', cb);
    };
  }
});
