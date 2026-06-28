import { AliasToken } from 'antd/lib/theme/interface';
import { DEFAULT_LIGHT_THEME, ResolvedTheme } from 'src/theme/theme-contract';
import type { NormalObject } from '_types';

export function applyThemeToDocument(theme: ResolvedTheme, root: HTMLElement = document.documentElement): void {
  Object.keys(theme.tokens).forEach(key => {
    root.style.setProperty(`--${key}`, theme.tokens[key]);
  });
  root.dataset.theme = theme.id;
  root.dataset.themeMode = theme.mode;
}

export function deriveAntdToken(theme: ResolvedTheme, config?: NormalObject): AliasToken {
  const tokens = { ...DEFAULT_LIGHT_THEME.tokens, ...theme.tokens };
  const token = {
    colorBgContainer: tokens['nw-panel-bg'],
    colorBgLayout: tokens['nw-app-bg'],
    colorText: tokens['nw-text-primary'],
    colorTextSecondary: tokens['nw-text-secondary'],
    colorBorder: tokens['nw-border-color'],
    colorPrimary: tokens['nw-theme-url-content'],
    colorError: tokens['nw-danger-color']
  } as AliasToken;

  if (config?.uiFont) {
    token.fontFamily = config.uiFont as string;
  }

  if (config?.uiFontSize) {
    token.fontSize = parseInt(config.uiFontSize as string);
  }

  return token;
}
