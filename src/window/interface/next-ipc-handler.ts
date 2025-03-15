import { NormalObject, Response } from '_types';

interface INextIpcHandler {
  type: string;
  /**
   * Invoke when get ipc request.
   */
  apply(type: string, data?: NormalObject): Promise<Response>;
}

export default INextIpcHandler;
