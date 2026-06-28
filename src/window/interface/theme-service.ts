import type { ResolvedTheme, ThemeState } from 'src/theme/theme-contract';

interface IThemeService {
  initThemes(): Promise<void>;
  getThemeState(themeId?: string): Promise<ThemeState>;
  applyTheme(themeId: string): Promise<ResolvedTheme>;
}

export default IThemeService;
