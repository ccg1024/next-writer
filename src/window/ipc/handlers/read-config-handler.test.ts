/// <reference types="jest" />

import 'reflect-metadata';
import { DEFAULT_LIGHT_THEME } from 'src/theme/theme-contract';
import { RootLibraryTree } from '_types';
import ILibraryTreeStore from '../../interface/library-tree-store';
import IRenderConfigStore from '../../interface/render-config-store';
import IThemeService from '../../interface/theme-service';
import ReadConfigHandler from './read-config-handler';

describe('ReadConfigHandler', () => {
  it('returns renderer config, library tree, theme list, and active theme', async () => {
    const config = { themeId: 'default-light' };
    const libTree: RootLibraryTree = { id: '__root__', children: [] };
    const handler = new ReadConfigHandler(
      { getConfig: jest.fn(() => config) } as unknown as IRenderConfigStore,
      { getTree: jest.fn(() => libTree) } as unknown as ILibraryTreeStore,
      {
        getThemeState: jest.fn(async () => ({
          themes: [{ id: DEFAULT_LIGHT_THEME.id, name: DEFAULT_LIGHT_THEME.name, mode: DEFAULT_LIGHT_THEME.mode }],
          activeTheme: DEFAULT_LIGHT_THEME
        }))
      } as unknown as IThemeService
    );

    await expect(handler.handle()).resolves.toEqual({
      config,
      libTree,
      themes: [{ id: DEFAULT_LIGHT_THEME.id, name: DEFAULT_LIGHT_THEME.name, mode: DEFAULT_LIGHT_THEME.mode }],
      activeTheme: DEFAULT_LIGHT_THEME
    });
  });
});
