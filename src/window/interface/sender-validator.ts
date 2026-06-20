import type { IpcMainInvokeEvent } from 'electron';
import type { IpcContext } from '../ipc/ipc-context';

interface ISenderValidator {
  isTrusted(event: IpcMainInvokeEvent): boolean;
  createContext(event: IpcMainInvokeEvent): IpcContext;
}

export default ISenderValidator;
