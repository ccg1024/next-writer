import type { IpcMainInvokeEvent } from 'electron';
import { AnyIpcRequest, IpcChannel, IpcRequestData, IpcResponse } from '../ipc/ipc-contract';
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
  listener(e: IpcMainInvokeEvent, req: unknown): Promise<IpcResponse>;

  /**
   * Dispatch task to deal with renderer process request
   */
  dispatch<C extends IpcChannel>(e: IpcMainInvokeEvent, type: C, data: IpcRequestData<C>): Promise<IpcResponse>;
  dispatch(e: IpcMainInvokeEvent, type: AnyIpcRequest['type'], data?: AnyIpcRequest['data']): Promise<IpcResponse>;

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
