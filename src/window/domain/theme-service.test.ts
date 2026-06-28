/// <reference types="jest" />

import 'reflect-metadata';
import nodeFs from 'fs';
import nodeOs from 'os';
import nodePath from 'path';
import { CONFIG_JSON_NAME } from 'src/config/env';
import { DEFAULT_THEME_ID, THEME_DIR_NAME } from 'src/theme/theme-contract';
import FileSystem from '../infrastructure/file-system';
import AppPathStore from '../state/app-path-store';
import RenderConfigStore from '../state/render-config-store';
import ThemeService from './theme-service';

describe('ThemeService', () => {
  let tempDir: string;
  let configDir: string;
  let appPathStore: AppPathStore;
  let renderConfigStore: RenderConfigStore;
  let themeService: ThemeService;

  beforeEach(async () => {
    tempDir = await nodeFs.promises.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'next-writer-theme-'));
    configDir = nodePath.join(tempDir, 'config');
    appPathStore = new AppPathStore();
    appPathStore.setPaths({ configDir });
    renderConfigStore = new RenderConfigStore();
    renderConfigStore.setConfig({ themeId: DEFAULT_THEME_ID });
    themeService = new ThemeService(new FileSystem(), appPathStore, renderConfigStore);
  });

  afterEach(async () => {
    await nodeFs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('creates the theme directory and returns the built-in fallback theme', async () => {
    await themeService.initThemes();

    await expect(nodeFs.promises.stat(nodePath.join(configDir, THEME_DIR_NAME))).resolves.toBeDefined();
    const state = await themeService.getThemeState();

    expect(state.themes).toEqual([{ id: DEFAULT_THEME_ID, name: 'Default Light', mode: 'light' }]);
    expect(state.activeTheme.id).toBe(DEFAULT_THEME_ID);
  });

  it('loads valid json themes and ignores invalid files and unknown tokens', async () => {
    const themeDir = nodePath.join(configDir, THEME_DIR_NAME);
    await nodeFs.promises.mkdir(themeDir, { recursive: true });
    await nodeFs.promises.writeFile(
      nodePath.join(themeDir, 'solarized-dark.json'),
      JSON.stringify({
        schemaVersion: 1,
        name: 'Solarized Dark',
        mode: 'dark',
        tokens: {
          'nw-app-bg': '#002b36',
          'nw-text-primary': '#eee8d5',
          unknown: '#ffffff'
        }
      })
    );
    await nodeFs.promises.writeFile(nodePath.join(themeDir, 'broken.json'), '{');
    await nodeFs.promises.mkdir(nodePath.join(themeDir, 'nested.json'));

    const state = await themeService.getThemeState('solarized-dark');

    expect(state.themes.map(theme => theme.id)).toEqual([DEFAULT_THEME_ID, 'solarized-dark']);
    expect(state.activeTheme).toMatchObject({
      id: 'solarized-dark',
      name: 'Solarized Dark',
      mode: 'dark'
    });
    expect(state.activeTheme.tokens['nw-app-bg']).toBe('#002b36');
    expect(state.activeTheme.tokens.unknown).toBeUndefined();
    expect(state.activeTheme.tokens['nw-theme-head-content']).toBe('#586ea5');
  });

  it('falls back to the built-in theme when the configured theme is missing', async () => {
    renderConfigStore.setConfig({ themeId: 'missing-theme' });

    const state = await themeService.getThemeState();

    expect(state.activeTheme.id).toBe(DEFAULT_THEME_ID);
  });

  it('applies a theme by persisting themeId and updating render config', async () => {
    const themeDir = nodePath.join(configDir, THEME_DIR_NAME);
    await nodeFs.promises.mkdir(themeDir, { recursive: true });
    await nodeFs.promises.writeFile(
      nodePath.join(themeDir, 'solarized-dark.json'),
      JSON.stringify({
        schemaVersion: 1,
        name: 'Solarized Dark',
        mode: 'dark',
        tokens: {
          'nw-app-bg': '#002b36'
        }
      })
    );
    await nodeFs.promises.writeFile(
      nodePath.join(configDir, CONFIG_JSON_NAME),
      JSON.stringify({ root: '/workspace', uiFontSize: '15px', themeId: DEFAULT_THEME_ID })
    );

    const theme = await themeService.applyTheme('solarized-dark');
    const persisted = JSON.parse(await nodeFs.promises.readFile(nodePath.join(configDir, CONFIG_JSON_NAME), 'utf8'));

    expect(theme.id).toBe('solarized-dark');
    expect(persisted).toEqual({ root: '/workspace', uiFontSize: '15px', themeId: 'solarized-dark' });
    expect(renderConfigStore.getConfig()).toEqual({ uiFontSize: '15px', themeId: 'solarized-dark' });
  });

  it('rejects applying unknown themes', async () => {
    await expect(themeService.applyTheme('missing-theme')).rejects.toThrow('Theme "missing-theme" does not exist.');
  });
});
