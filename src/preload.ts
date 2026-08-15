// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import { IPC_CHANNEL, IPC_SERVER_NAME } from 'src/window/ipc/ipc-contract';
import { validateIpcRequest } from 'src/window/ipc/request-validator';

type CallbackFunction = (...args: unknown[]) => void;

function post(param: unknown) {
  // 即使调用来自受信任的渲染页面，也先按与主进程相同的契约裁剪和校验请求。
  const validation = validateIpcRequest(param);

  if (validation.valid === false) {
    return Promise.resolve({ status: -1, data: null, message: validation.message });
  }

  return ipcRenderer.invoke(IPC_SERVER_NAME, validation.request);
}

// 仅暴露按业务命名的最小能力，不向渲染进程泄露通用 ipcRenderer。
contextBridge.exposeInMainWorld('ipc', {
  readConfig() {
    return post({ type: IPC_CHANNEL.READ_CONFIG });
  },

  listThemes() {
    return post({ type: IPC_CHANNEL.LIST_THEMES });
  },

  applyTheme(data: unknown) {
    return post({ type: IPC_CHANNEL.APPLY_THEME, data });
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

  getDocumentSession(data: unknown) {
    return post({ type: IPC_CHANNEL.GET_DOCUMENT_SESSION, data });
  },

  updateDocumentSession(data: unknown) {
    return post({ type: IPC_CHANNEL.UPDATE_DOCUMENT_SESSION, data });
  },

  flushDocument(data: unknown) {
    return post({ type: IPC_CHANNEL.FLUSH_DOCUMENT, data });
  },

  getRecoveryDraft(data: unknown) {
    return post({ type: IPC_CHANNEL.GET_RECOVERY_DRAFT, data });
  },

  recoverDraft(data: unknown) {
    return post({ type: IPC_CHANNEL.RECOVER_DRAFT, data });
  },

  discardRecoveryDraft(data: unknown) {
    return post({ type: IPC_CHANNEL.DISCARD_RECOVERY_DRAFT, data });
  },

  resolveDocumentConflict(data: unknown) {
    return post({ type: IPC_CHANNEL.RESOLVE_DOCUMENT_CONFLICT, data });
  },

  saveDocumentCopy(data: unknown) {
    return post({ type: IPC_CHANNEL.SAVE_DOCUMENT_COPY, data });
  },

  /** 订阅主进程发出的菜单命令，并返回精确移除当前监听器的清理函数。 */
  rendererListener: (cb: CallbackFunction) => {
    const listener = (_event: IpcRendererEvent, action: unknown) => cb(action);
    ipcRenderer.on('next-ipc-client', listener);

    return () => {
      ipcRenderer.removeListener('next-ipc-client', listener);
    };
  }
});
