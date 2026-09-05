import { inject, injectable } from 'inversify';
import { DEFAULT_AUTO_SAVE_DELAY_MS } from 'src/config/env';
import type { RuntimeConfigResponse } from '_types';
import IIpcHandler from '../../interface/ipc-handler';
import IMenuStateStore from '../../interface/menu-state-store';
import IRenderConfigStore from '../../interface/render-config-store';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class RuntimeHandler implements IIpcHandler<typeof IPC_CHANNEL.RUNTIME> {
  channel = IPC_CHANNEL.RUNTIME;

  constructor(
    @inject(TYPES.IMenuStateStore) private menuStateStore: IMenuStateStore,
    @inject(TYPES.IRenderConfigStore) private renderConfigStore: IRenderConfigStore
  ) {}

  async handle(): Promise<RuntimeConfigResponse> {
    return createRuntimeConfigResponse(this.menuStateStore, this.renderConfigStore);
  }
}

export function createRuntimeConfigResponse(
  menuStateStore: IMenuStateStore,
  renderConfigStore: IRenderConfigStore
): RuntimeConfigResponse {
  const autoSave = renderConfigStore.getConfig().autoSave;
  return {
    menuStatus: menuStateStore.getStatus(),
    autoSave: {
      enabled: typeof autoSave !== 'object' || autoSave === null || autoSave.enabled !== false,
      delayMs:
        typeof autoSave === 'object' &&
        autoSave !== null &&
        typeof autoSave.delayMs === 'number' &&
        Number.isFinite(autoSave.delayMs) &&
        autoSave.delayMs >= 0
          ? autoSave.delayMs
          : DEFAULT_AUTO_SAVE_DELAY_MS
    }
  };
}

export default RuntimeHandler;
