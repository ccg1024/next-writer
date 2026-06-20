import type { IpcMainInvokeEvent } from 'electron';
import { inject, injectable } from 'inversify';
import type { IpcContext } from './ipc-context';
import ISenderValidator from '../interface/sender-validator';
import IWindowRegistry from '../interface/window-registry';
import { TYPES } from '../types';

@injectable()
class SenderValidator implements ISenderValidator {
  constructor(@inject(TYPES.IWindowRegistry) private windowRegistry: IWindowRegistry) {}

  isTrusted(event: IpcMainInvokeEvent): boolean {
    const win = this.windowRegistry.getCurrentWindow();
    return !!win && !win.isDestroyed() && event.sender.id === win.webContents.id;
  }

  createContext(event: IpcMainInvokeEvent): IpcContext {
    return {
      event,
      senderFrame: event.senderFrame ?? null,
      window: this.windowRegistry.getCurrentWindow()
    };
  }
}

export default SenderValidator;
