import nodePath from 'path';
import { inject, injectable } from 'inversify';
import { CONFIG_JSON_NAME } from 'src/config/env';
import {
  DEFAULT_LIGHT_THEME,
  DEFAULT_THEME_ID,
  ResolvedTheme,
  THEME_DIR_NAME,
  THEME_SCHEMA_VERSION,
  THEME_TOKEN_KEY_SET,
  ThemeManifest,
  ThemeMode,
  ThemeState,
  toThemeListItem
} from 'src/theme/theme-contract';
import type { NormalObject } from '_types';
import IAppPathStore from '../interface/app-path-store';
import IFileSystem from '../interface/file-system';
import IRenderConfigStore from '../interface/render-config-store';
import IThemeService from '../interface/theme-service';
import { TYPES } from '../types';

type ThemeRegistry = {
  themes: ResolvedTheme[];
  themeById: Map<string, ResolvedTheme>;
};

@injectable()
class ThemeService implements IThemeService {
  private invalidThemeErrors: string[] = [];

  constructor(
    @inject(TYPES.IFileSystem) private fileSystem: IFileSystem,
    @inject(TYPES.IAppPathStore) private appPathStore: IAppPathStore,
    @inject(TYPES.IRenderConfigStore) private renderConfigStore: IRenderConfigStore
  ) {}

  async initThemes(): Promise<void> {
    await this.fileSystem.ensureDir(this.getThemeDir());
  }

  async getThemeState(themeId?: string): Promise<ThemeState> {
    const registry = await this.loadThemeRegistry();
    const activeThemeId = themeId || this.getConfiguredThemeId();
    const activeTheme = registry.themeById.get(activeThemeId) ?? DEFAULT_LIGHT_THEME;

    return {
      themes: registry.themes.map(toThemeListItem),
      activeTheme
    };
  }

  async applyTheme(themeId: string): Promise<ResolvedTheme> {
    const registry = await this.loadThemeRegistry();
    const theme = registry.themeById.get(themeId);

    if (!theme) {
      throw new Error(`Theme "${themeId}" does not exist.`);
    }

    const configFilePath = this.getConfigFilePath();
    const config = await this.readConfigFile(configFilePath);
    const nextConfig: Record<string, unknown> = { ...config, themeId };

    await this.fileSystem.writeFile(configFilePath, JSON.stringify(nextConfig, null, 2));
    const { root: _root, ...renderConfig } = nextConfig;
    this.renderConfigStore.setConfig(renderConfig as NormalObject);

    return theme;
  }

  private async loadThemeRegistry(): Promise<ThemeRegistry> {
    await this.initThemes();
    this.invalidThemeErrors = [];

    const themeById = new Map<string, ResolvedTheme>();
    themeById.set(DEFAULT_LIGHT_THEME.id, DEFAULT_LIGHT_THEME);

    const entries = await this.fileSystem.readDir(this.getThemeDir());
    const themeFiles = entries
      .filter(entry => entry.isFile() && nodePath.extname(entry.name).toLowerCase() === '.json')
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of themeFiles) {
      const id = nodePath.basename(entry.name, '.json');

      if (id === DEFAULT_THEME_ID) {
        continue;
      }

      try {
        const content = await this.fileSystem.readFile(nodePath.join(this.getThemeDir(), entry.name));
        const manifest = JSON.parse(content);
        const theme = this.resolveManifest(id, manifest);
        themeById.set(theme.id, theme);
      } catch (error) {
        this.invalidThemeErrors.push(`${entry.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      themes: Array.from(themeById.values()),
      themeById
    };
  }

  private resolveManifest(id: string, value: unknown): ResolvedTheme {
    if (!isRecord(value)) {
      throw new Error('Theme manifest must be an object.');
    }

    const manifest = value as Partial<ThemeManifest>;

    if (manifest.schemaVersion !== THEME_SCHEMA_VERSION) {
      throw new Error('Theme schemaVersion must be 1.');
    }

    if (typeof manifest.name !== 'string' || manifest.name.trim() === '') {
      throw new Error('Theme name must be a non-empty string.');
    }

    if (!isThemeMode(manifest.mode)) {
      throw new Error('Theme mode must be light or dark.');
    }

    if (!isRecord(manifest.tokens)) {
      throw new Error('Theme tokens must be an object.');
    }

    return {
      id,
      name: manifest.name.trim(),
      mode: manifest.mode,
      tokens: {
        ...DEFAULT_LIGHT_THEME.tokens,
        ...filterThemeTokens(manifest.tokens)
      }
    };
  }

  private getConfiguredThemeId(): string {
    const config = this.renderConfigStore.getConfig();
    return typeof config.themeId === 'string' && config.themeId.trim() !== '' ? config.themeId : DEFAULT_THEME_ID;
  }

  private getThemeDir(): string {
    return nodePath.join(this.appPathStore.getConfigDir(), THEME_DIR_NAME);
  }

  private getConfigFilePath(): string {
    return nodePath.join(this.appPathStore.getConfigDir(), CONFIG_JSON_NAME);
  }

  private async readConfigFile(configFilePath: string): Promise<Record<string, unknown>> {
    if (!(await this.fileSystem.exists(configFilePath))) {
      return {};
    }

    const content = await this.fileSystem.readFile(configFilePath);
    const parsed = JSON.parse(content);
    return isRecord(parsed) ? parsed : {};
  }
}

function filterThemeTokens(tokens: Record<string, unknown>): Record<string, string> {
  const safeTokens: Record<string, string> = {};

  Object.keys(tokens).forEach(key => {
    const value = tokens[key];
    if (THEME_TOKEN_KEY_SET.has(key) && isSafeThemeValue(value)) {
      safeTokens[key] = value;
    }
  });

  return safeTokens;
}

function isSafeThemeValue(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  return (
    trimmed !== '' &&
    trimmed.length <= 120 &&
    !/[;{}<>`]/.test(trimmed) &&
    !lower.includes('url(') &&
    !lower.includes('@import') &&
    !lower.includes('expression(')
  );
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

export default ThemeService;
