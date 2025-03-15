import type { IpcMainInvokeEvent } from 'electron';
import { NormalObject, Request, Response } from '_types';
import INextIpcHandler from './next-ipc-handler';

interface INextIpcServer {
  /**
   * Start ipc server
   */
  listen(): void;

  /**
   * Remove all server listener
   */
  destroy(): void;

  /**
   * Handle renderer process request
   */
  listener(e: IpcMainInvokeEvent, req: Request): Promise<Response>;

  /**
   * Dispatch task to deal with renderer process request
   */
  dispatch(type: string, data?: NormalObject): Promise<Response>;

  /**
   * Register a handler to hanlder list.
   */
  registerHandler(handler: INextIpcHandler): void;

  /**
   * Remove target handler, if it's exist in handler list.
   */
  removeHandler(handler: INextIpcHandler): void;
}

export default INextIpcServer;
