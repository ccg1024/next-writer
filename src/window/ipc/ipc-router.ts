import { ipcMain } from 'electron';
import { inject, injectable } from 'inversify';
import IIpcHandler from '../interface/ipc-handler';
import IIpcRouter from '../interface/ipc-router';
import ISenderValidator from '../interface/sender-validator';
import { AnyIpcRequest, IPC_SERVER_NAME, IpcChannel, IpcRequestData, IpcResponse } from './ipc-contract';
import { validateIpcRequest } from './request-validator';
import { TYPES } from '../types';

@injectable()
class IpcRouter implements IIpcRouter {
  private handlers: Map<IpcChannel, IIpcHandler>;

  constructor(@inject(TYPES.ISenderValidator) private senderValidator: ISenderValidator) {
    this.handlers = new Map();
    this.listener = this.listener.bind(this);
  }

  listen(): void {
    ipcMain.removeHandler(IPC_SERVER_NAME);
    ipcMain.handle(IPC_SERVER_NAME, this.listener);
  }

  listener(event: Electron.IpcMainInvokeEvent, req: unknown): Promise<IpcResponse> {
    const validation = validateIpcRequest(req);

    if (validation.valid === false) {
      return Promise.resolve({ status: -1, data: null, message: validation.message });
    }

    const { type, data } = validation.request;
    return this.dispatch(event, type, data);
  }

  async dispatch<C extends IpcChannel>(
    event: Electron.IpcMainInvokeEvent,
    type: C,
    data: IpcRequestData<C>
  ): Promise<IpcResponse>;
  async dispatch(
    event: Electron.IpcMainInvokeEvent,
    type: AnyIpcRequest['type'],
    data?: AnyIpcRequest['data']
  ): Promise<IpcResponse> {
    const handler = this.handlers.get(type);

    if (!handler) {
      return { status: -1, data: null, message: 'Do not attach handler to handle such request.' };
    }

    if (!this.senderValidator.isTrusted(event)) {
      return { status: -1, data: null, message: 'Untrusted IPC sender.' };
    }

    try {
      const result = await handler.handle(data, {
        ...this.senderValidator.createContext(event)
      });
      return { status: 0, data: result ?? null };
    } catch (error) {
      return {
        status: -1,
        data: null,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  registerHandler(handler: IIpcHandler) {
    if (handler && typeof handler.handle === 'function') {
      if (this.handlers.has(handler.channel)) {
        throw new Error(`Duplicate IPC handler channel: ${handler.channel}`);
      }
      this.handlers.set(handler.channel, handler);
    }
  }

  removeHandler(handler: IIpcHandler) {
    this.handlers.delete(handler.channel);
  }

  destroy(): void {
    this.handlers.clear();
    ipcMain.removeAllListeners(IPC_SERVER_NAME);
    ipcMain.removeHandler(IPC_SERVER_NAME);
  }
}

export default IpcRouter;
