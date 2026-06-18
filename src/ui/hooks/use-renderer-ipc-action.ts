import { useEffect, useRef } from 'react';
import { IpcRendererEvent } from 'electron';
import { RendererListenerAction } from '_types';
import rendererIpcListener, { RendererIpcActionCallback } from '../modules/ipc';

export function useRendererIpcAction(
  type: RendererListenerAction['type'],
  handler: (event: IpcRendererEvent, action: RendererListenerAction) => void
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
