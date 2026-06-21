import { RendererListenerAction } from '_types';
import { useRendererCommand } from 'src/ui/shared/renderer-command';

export function useRendererIpcAction(
  type: RendererListenerAction['type'],
  handler: (event: null, action: RendererListenerAction) => void
) {
  useRendererCommand(type, handler);
}
