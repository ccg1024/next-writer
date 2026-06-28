export const DEFAULT_THEME_ID = 'default-light';
export const THEME_DIR_NAME = 'themes';
export const THEME_SCHEMA_VERSION = 1;

export type ThemeMode = 'light' | 'dark';

export type ThemeManifest = {
  schemaVersion: 1;
  name: string;
  mode: ThemeMode;
  tokens: Record<string, string>;
};

export type ResolvedTheme = {
  id: string;
  name: string;
  mode: ThemeMode;
  tokens: Record<string, string>;
};

export type ThemeListItem = {
  id: string;
  name: string;
  mode: ThemeMode;
};

export type ThemeState = {
  themes: ThemeListItem[];
  activeTheme: ResolvedTheme;
};

export const THEME_TOKEN_KEYS = [
  'nw-app-bg',
  'nw-panel-bg',
  'nw-sidebar-bg',
  'nw-border-color',
  'nw-text-primary',
  'nw-text-secondary',
  'nw-hover-bg',
  'nw-selected-bg',
  'nw-danger-color',
  'nw-editor-bg',
  'nw-editor-text',
  'nw-editor-selection-bg',
  'nw-theme-head-content',
  'nw-theme-quote-content',
  'nw-theme-emphasis-content',
  'nw-theme-strong-content',
  'nw-theme-list-content',
  'nw-theme-url-content',
  'nw-theme-link-content',
  'nw-theme-inline-code-content',
  'nw-theme-head-mark',
  'nw-theme-quote-mark',
  'nw-theme-list-mark',
  'nw-theme-link-mark',
  'nw-theme-code-mark',
  'nw-theme-code-info',
  'ne-theme-table-delimiter'
] as const;

export type ThemeTokenKey = (typeof THEME_TOKEN_KEYS)[number];

export const THEME_TOKEN_KEY_SET = new Set<string>(THEME_TOKEN_KEYS);

export const DEFAULT_LIGHT_THEME: ResolvedTheme = {
  id: DEFAULT_THEME_ID,
  name: 'Default Light',
  mode: 'light',
  tokens: {
    'nw-app-bg': '#ffffff',
    'nw-panel-bg': '#ffffff',
    'nw-sidebar-bg': '#ebebeb',
    'nw-border-color': 'rgba(0, 0, 0, 0.1)',
    'nw-text-primary': 'rgba(0, 0, 0, 0.88)',
    'nw-text-secondary': 'rgba(0, 0, 0, 0.65)',
    'nw-hover-bg': 'rgba(0, 0, 0, 0.04)',
    'nw-selected-bg': 'rgba(0, 0, 0, 0.06)',
    'nw-danger-color': '#ff4d4f',
    'nw-editor-bg': '#ffffff',
    'nw-editor-text': '#000000',
    'nw-editor-selection-bg': 'rgba(217, 217, 217, 0.5)',
    'nw-theme-head-content': '#586ea5',
    'nw-theme-quote-content': '#839496',
    'nw-theme-emphasis-content': '#bf7060',
    'nw-theme-strong-content': '#fd5455',
    'nw-theme-list-content': '#000000',
    'nw-theme-url-content': '#4299e1',
    'nw-theme-link-content': '#68d391',
    'nw-theme-inline-code-content': '#4299e1',
    'nw-theme-head-mark': '#a9b8cc',
    'nw-theme-quote-mark': '#4299e1',
    'nw-theme-list-mark': '#a0aec0',
    'nw-theme-link-mark': '#4299e1',
    'nw-theme-code-mark': '#a0aec0',
    'nw-theme-code-info': '#000000',
    'ne-theme-table-delimiter': '#a0aec0'
  }
};

export function toThemeListItem(theme: ResolvedTheme): ThemeListItem {
  return {
    id: theme.id,
    name: theme.name,
    mode: theme.mode
  };
}
