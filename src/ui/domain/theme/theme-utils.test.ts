/// <reference types="jest" />

import { DEFAULT_LIGHT_THEME } from 'src/theme/theme-contract';
import { applyThemeToDocument, deriveAntdToken } from './theme-utils';

describe('theme-utils', () => {
  it('applies theme tokens and data attributes to the document element', () => {
    const root = document.createElement('div');

    applyThemeToDocument(
      {
        ...DEFAULT_LIGHT_THEME,
        id: 'test-theme',
        mode: 'dark',
        tokens: {
          ...DEFAULT_LIGHT_THEME.tokens,
          'nw-app-bg': '#000000'
        }
      },
      root
    );

    expect(root.style.getPropertyValue('--nw-app-bg')).toBe('#000000');
    expect(root.dataset.theme).toBe('test-theme');
    expect(root.dataset.themeMode).toBe('dark');
  });

  it('derives AntD token values with defaults for missing theme values', () => {
    const token = deriveAntdToken(
      {
        ...DEFAULT_LIGHT_THEME,
        tokens: {
          'nw-panel-bg': '#111111'
        }
      },
      { uiFont: 'Inter', uiFontSize: '15px' }
    );

    expect(token.colorBgContainer).toBe('#111111');
    expect(token.colorText).toBe(DEFAULT_LIGHT_THEME.tokens['nw-text-primary']);
    expect(token.fontFamily).toBe('Inter');
    expect(token.fontSize).toBe(15);
  });
});
