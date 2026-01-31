import { ipcMain } from 'electron';
import { injectable } from 'inversify';
import { isTrulyEmpty } from 'src/tools/utils';
import { Request, Response } from '_types';
import INextIpcHandler from '../interface/next-ipc-handler';
import INextIpcServer from '../interface/next-ipc-server';

export const IPC_SERVER_NAME = 'next-ipc-server';

@injectable()
class NextIpcServer implements INextIpcServer {
  private handlers: Array<INextIpcHandler>;

  constructor() {
    this.handlers = [];
    this.listener = this.listener.bind(this);
  }

  listen(): void {
    ipcMain.handle(IPC_SERVER_NAME, this.listener);
  }

  listener(_e: Electron.IpcMainInvokeEvent, req: Request<unknown>): Promise<Response<unknown>> {
    if (!isTrulyEmpty(req)) {
      const { type, data } = req;
      return this.dispatch(type, data);
    }
  }

  async dispatch(type: string, data?: unknown): Promise<Response<unknown>> {
    const handler = this.handlers.find(handler => handler.type === type);

    if (!handler) {
      return { status: -1, data: null, message: 'Do not attach handler to handle such request.' };
    }

    try {
      const result = await handler.apply(type, data);
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
    if (handler && typeof handler.apply === 'function') {
      this.handlers.push(handler);
    }
  }

  removeHandler(handler: INextIpcHandler) {
    const id = this.handlers.indexOf(handler);
    if (id !== -1) {
      this.handlers.splice(id, 1);
    }
  }

  destroy(): void {
    this.handlers = [];
    ipcMain.removeAllListeners(IPC_SERVER_NAME);
    ipcMain.removeHandler(IPC_SERVER_NAME);
  }
}

export default NextIpcServer;
