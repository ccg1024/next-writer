import { Response } from '_types';

interface INextIpcHandler {
  type: string;
  /**
   * Invoke when get ipc request.
   */
  apply(type: string, data?: unknown): Promise<Response<unknown>>;
}

export default INextIpcHandler;
