import type { IpcContext } from '../ipc/ipc-context';

interface INextIpcHandler<TRequest = unknown, TResponse = unknown> {
  channel: string;
  /**
   * Invoke when get ipc request.
   * Handler should return business data directly or throw Error on failure.
   * Response wrapping is handled by NextIpcServer.
   */
  handle(data: TRequest, context: IpcContext): Promise<TResponse>;
}

export default INextIpcHandler;
