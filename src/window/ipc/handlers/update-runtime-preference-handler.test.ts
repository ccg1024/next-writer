/// <reference types="jest" />

import 'reflect-metadata';
import { Menu } from 'electron';
import type IConfigService from '../../interface/config-service';
import MenuStateStore from '../../state/menu-state-store';
import RenderConfigStore from '../../state/render-config-store';
import UpdateRuntimePreferenceHandler from './update-runtime-preference-handler';

const menuItem = { checked: false };

jest.mock('electron', () => ({
  Menu: {
    getApplicationMenu: jest.fn(() => ({ getMenuItemById: jest.fn(() => menuItem) }))
  }
}));

describe('UpdateRuntimePreferenceHandler', () => {
  beforeEach(() => {
    menuItem.checked = false;
    jest.clearAllMocks();
  });

  it('persists auto-save and returns the complete runtime config', async () => {
    const renderConfig = new RenderConfigStore();
    renderConfig.setConfig({ autoSave: { enabled: true, delayMs: 900 } });
    const configService = {
      patchConfig: jest.fn(async () => {
        renderConfig.setConfig({ autoSave: { enabled: false, delayMs: 900 } });
        return {};
      })
    } as unknown as IConfigService;
    const handler = new UpdateRuntimePreferenceHandler(configService, new MenuStateStore(), renderConfig);

    await expect(handler.handle({ preference: 'autoSave.enabled', value: false })).resolves.toMatchObject({
      autoSave: { enabled: false, delayMs: 900 },
      menuStatus: { typewriterMode: false }
    });
    expect(configService.patchConfig).toHaveBeenCalledWith({ autoSave: { enabled: false } });
  });

  it('synchronizes typewriter state and native menu checkmark', async () => {
    const menuState = new MenuStateStore();
    const handler = new UpdateRuntimePreferenceHandler(
      { patchConfig: jest.fn() } as unknown as IConfigService,
      menuState,
      new RenderConfigStore()
    );

    const response = await handler.handle({ preference: 'typewriterMode', value: true });
    expect(response.menuStatus.typewriterMode).toBe(true);
    expect(menuItem.checked).toBe(true);
    expect(Menu.getApplicationMenu).toHaveBeenCalled();
  });
});
