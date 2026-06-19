import type { BrowserWindow, IpcMainInvokeEvent, WebFrameMain } from 'electron';

export interface IpcContext {
  event: IpcMainInvokeEvent;
  senderFrame: WebFrameMain | null;
  window: BrowserWindow | null;
}
