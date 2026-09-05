import { inject, injectable } from 'inversify';
import { Menu } from 'electron';
import type { RuntimeConfigResponse, UpdateRuntimePreferenceRequest } from '_types';
import IConfigService from '../../interface/config-service';
import IIpcHandler from '../../interface/ipc-handler';
import IMenuStateStore from '../../interface/menu-state-store';
import IRenderConfigStore from '../../interface/render-config-store';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';
import { createRuntimeConfigResponse } from './runtime-handler';

@injectable()
class UpdateRuntimePreferenceHandler implements IIpcHandler<typeof IPC_CHANNEL.UPDATE_RUNTIME_PREFERENCE> {
  channel = IPC_CHANNEL.UPDATE_RUNTIME_PREFERENCE;

  constructor(
    @inject(TYPES.IConfigService) private configService: IConfigService,
    @inject(TYPES.IMenuStateStore) private menuStateStore: IMenuStateStore,
    @inject(TYPES.IRenderConfigStore) private renderConfigStore: IRenderConfigStore
  ) {}

  async handle(data: UpdateRuntimePreferenceRequest): Promise<RuntimeConfigResponse> {
    if (data.preference === 'autoSave.enabled') {
      await this.configService.patchConfig({ autoSave: { enabled: data.value } });
    } else {
      this.menuStateStore.setTypewriterMode(data.value);
      const menuItem = Menu.getApplicationMenu()?.getMenuItemById('typewriter-mode');
      if (menuItem) menuItem.checked = data.value;
    }
    return createRuntimeConfigResponse(this.menuStateStore, this.renderConfigStore);
  }
}

export default UpdateRuntimePreferenceHandler;
