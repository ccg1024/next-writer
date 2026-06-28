import type { MainProcessMenuStatus, RendererListenerAction } from '_types';

interface IMenuStateStore {
  reset(): void;
  getStatus(): MainProcessMenuStatus;
  toggle(
    type: Extract<
      RendererListenerAction['type'],
      'toggle-lib' | 'toggle-lib-detail' | 'toggle-toc' | 'toggle-typewriter-mode'
    >
  ): boolean;
}

export default IMenuStateStore;
