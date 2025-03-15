import type { IpcMainInvokeEvent } from 'electron';
import { NormalObject, Request, Response } from '_types';
/**
 * Simulatng server services
 *
 * @author crazycodegame
 */
interface IpcServer {
  /**
   * Start server
   */
  listen(): void;

  /**
   * Remove all server listener
   */
  destroy(): void;

  /**
   * Handle renderer process request
   */
  listener(_e: IpcMainInvokeEvent, req: Request): Promise<Response>;

  /**
   * Dispatch task to deal with renderer process request
   */
  dispatch(type: string, data?: NormalObject): Promise<Response>;
}

export default IpcServer;
