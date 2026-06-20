import type { IpcMainInvokeEvent } from 'electron';
import { AnyIpcRequest, IpcChannel, IpcRequestData, IpcResponse } from '../ipc/ipc-contract';
import IIpcHandler from './ipc-handler';

interface IIpcRouter {
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
  listener(e: IpcMainInvokeEvent, req: unknown): Promise<IpcResponse>;

  /**
   * Dispatch task to deal with renderer process request
   */
  dispatch<C extends IpcChannel>(e: IpcMainInvokeEvent, type: C, data: IpcRequestData<C>): Promise<IpcResponse>;
  dispatch(e: IpcMainInvokeEvent, type: AnyIpcRequest['type'], data?: AnyIpcRequest['data']): Promise<IpcResponse>;

  /**
   * Register a handler to handler list.
   */
  registerHandler(handler: IIpcHandler): void;

  /**
   * Remove target handler, if it exists in handler list.
   */
  removeHandler(handler: IIpcHandler): void;
}

export default IIpcRouter;
