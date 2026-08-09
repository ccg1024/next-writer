import { useEffect, useRef } from 'react';
import { RendererListenerAction } from '_types';
import rendererIpcListener, { RendererIpcActionCallback } from './renderer-ipc-listener';

export { default as rendererIpcListener } from './renderer-ipc-listener';

/** 订阅指定类型的主进程命令，并通过 ref 保持处理函数为最新版本而不反复注册监听器。 */
export function useRendererCommand(
  type: RendererListenerAction['type'],
  handler: (event: null, action: RendererListenerAction) => void
) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const actionCallback: RendererIpcActionCallback = (event, action) => {
      handlerRef.current(event, action);
    };
    actionCallback.type = type;

    rendererIpcListener.register(actionCallback);
    return () => {
      rendererIpcListener.deregister(actionCallback);
    };
  }, [type]);
}
