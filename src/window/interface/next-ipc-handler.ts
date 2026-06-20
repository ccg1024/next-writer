import type { IpcContext } from '../ipc/ipc-context';
import type { IpcChannel, IpcRequestData, IpcResponseData } from '../ipc/ipc-contract';

interface INextIpcHandler<C extends IpcChannel = IpcChannel> {
  channel: C;
  /**
   * Invoke when get ipc request.
   * Handler should return business data directly or throw Error on failure.
   * Response wrapping is handled by NextIpcServer.
   */
  handle(data: IpcRequestData<C>, context: IpcContext): Promise<IpcResponseData<C>>;
}

export default INextIpcHandler;
