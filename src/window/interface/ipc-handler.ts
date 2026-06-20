import type { IpcContext } from '../ipc/ipc-context';
import type { IpcChannel, IpcRequestData, IpcResponseData } from '../ipc/ipc-contract';

interface IIpcHandler<C extends IpcChannel = IpcChannel> {
  channel: C;
  /**
   * Handler should return business data directly or throw Error on failure.
   * Response wrapping is handled by IpcRouter.
   */
  handle(data: IpcRequestData<C>, context: IpcContext): Promise<IpcResponseData<C>>;
}

export default IIpcHandler;
