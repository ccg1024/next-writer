import { useEffect, useRef } from 'react';
import { RendererListenerAction } from '_types';
import rendererIpcListener, { RendererIpcActionCallback } from 'src/ui/modules/ipc';

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
