import { IpcRendererEvent } from 'electron';
import { RendererListenerAction } from '_types';

export interface RendererIpcActionCallback {
  (event: IpcRendererEvent, action: RendererListenerAction): void;
  type: RendererListenerAction['type'];
}

/**
 * The Renderer process monitors module, receives the communication from Main process, and triggers callbacks events of the related components.
 */
class RendererIpcListener {
  private callbacks: RendererIpcActionCallback[];
  private removeListener: CallableFunction;
  constructor() {
    this.callbacks = [];
    this.dispatch = this.dispatch.bind(this);
  }

  start() {
    this.removeListener = window.ipc.rendererListener(this.dispatch);
  }

  stop() {
    this.removeListener && this.removeListener();
  }

  private dispatch(event: IpcRendererEvent, action: RendererListenerAction) {
    this.callbacks.forEach(cb => {
      if (cb.type === action.type) {
        cb(event, action);
      }
    });
  }

  register(actionCallback: RendererIpcActionCallback) {
    this.callbacks.push(actionCallback);
  }

  deregister(actionCallback: RendererIpcActionCallback) {
    this.callbacks = this.callbacks.filter(cb => Object.is(cb, actionCallback));
  }
}

const rendererIpcListener = new RendererIpcListener();

export default rendererIpcListener;
