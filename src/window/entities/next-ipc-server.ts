import { ipcMain } from 'electron';
import { inject, injectable } from 'inversify';
import { isTrulyEmpty } from 'src/tools/utils';
import { Request, Response } from '_types';
import INextIpcHandler from '../interface/next-ipc-handler';
import INextIpcServer from '../interface/next-ipc-server';
import IWindowRegistry from '../interface/window-registry';
import { TYPES } from '../types';

export const IPC_SERVER_NAME = 'next-ipc-server';

@injectable()
class NextIpcServer implements INextIpcServer {
  private handlers: Map<string, INextIpcHandler>;

  constructor(@inject(TYPES.IWindowRegistry) private windowRegistry: IWindowRegistry) {
    this.handlers = new Map();
    this.listener = this.listener.bind(this);
  }

  listen(): void {
    ipcMain.removeHandler(IPC_SERVER_NAME);
    ipcMain.handle(IPC_SERVER_NAME, this.listener);
  }

  listener(_e: Electron.IpcMainInvokeEvent, req: Request<unknown>): Promise<Response<unknown>> {
    if (isTrulyEmpty(req) || isTrulyEmpty(req.type)) {
      return Promise.resolve({ status: -1, data: null, message: 'Invalid IPC request.' });
    }
    const { type, data } = req;
    return this.dispatch(_e, type, data);
  }

  async dispatch(event: Electron.IpcMainInvokeEvent, type: string, data?: unknown): Promise<Response<unknown>> {
    const handler = this.handlers.get(type);

    if (!handler) {
      return { status: -1, data: null, message: 'Do not attach handler to handle such request.' };
    }

    if (!this.isTrustedSender(event)) {
      return { status: -1, data: null, message: 'Untrusted IPC sender.' };
    }

    try {
      const result = await handler.handle(data, {
        event,
        senderFrame: event.senderFrame ?? null,
        window: this.windowRegistry.getCurrentWindow()
      });
      return { status: 0, data: result };
    } catch (error) {
      return {
        status: -1,
        data: null,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  registerHandler(handler: INextIpcHandler) {
    if (handler && typeof handler.handle === 'function') {
      if (this.handlers.has(handler.channel)) {
        throw new Error(`Duplicate IPC handler channel: ${handler.channel}`);
      }
      this.handlers.set(handler.channel, handler);
    }
  }

  removeHandler(handler: INextIpcHandler) {
    this.handlers.delete(handler.channel);
  }

  destroy(): void {
    this.handlers.clear();
    ipcMain.removeAllListeners(IPC_SERVER_NAME);
    ipcMain.removeHandler(IPC_SERVER_NAME);
  }

  private isTrustedSender(event: Electron.IpcMainInvokeEvent): boolean {
    const win = this.windowRegistry.getCurrentWindow();
    return !!win && !win.isDestroyed() && event.sender.id === win.webContents.id;
  }
}

export default NextIpcServer;
