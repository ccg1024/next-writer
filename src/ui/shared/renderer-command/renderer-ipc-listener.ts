import { RendererListenerAction } from '_types';

export interface RendererIpcActionCallback {
  (event: null, action: RendererListenerAction): void;
  type: RendererListenerAction['type'];
}

/** 接收主进程菜单命令，并按 action.type 分发给通过 Hook 注册的渲染组件。 */
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

  private dispatch(action: RendererListenerAction) {
    this.callbacks.forEach(cb => {
      if (cb.type === action.type) {
        cb(null, action);
      }
    });
  }

  register(actionCallback: RendererIpcActionCallback) {
    if (this.callbacks.some(cb => Object.is(cb, actionCallback))) {
      return;
    }
    this.callbacks.push(actionCallback);
  }

  deregister(actionCallback: RendererIpcActionCallback) {
    this.callbacks = this.callbacks.filter(cb => !Object.is(cb, actionCallback));
  }
}

const rendererIpcListener = new RendererIpcListener();

export default rendererIpcListener;
