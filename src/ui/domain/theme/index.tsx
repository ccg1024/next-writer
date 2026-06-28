import { createContext, PropsWithChildren, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { App, ConfigProvider, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { DEFAULT_LIGHT_THEME, ResolvedTheme, ThemeListItem } from 'src/theme/theme-contract';
import type { NormalObject } from '_types';
import rendererGateway from 'src/ui/shared/ipc/renderer-gateway';
import { applyThemeToDocument, deriveAntdToken } from './theme-utils';

type ThemeContextValue = {
  activeTheme: ResolvedTheme;
  themes: ThemeListItem[];
  applyThemeById: (themeId: string) => Promise<void>;
};

const ThemeRuntimeContext = createContext<ThemeContextValue>(null);

type AppThemeProviderProps = PropsWithChildren<{
  config?: NormalObject;
  activeTheme?: ResolvedTheme;
  themes?: ThemeListItem[];
}>;

export function AppThemeProvider({ config, activeTheme, themes, children }: AppThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState(activeTheme ?? DEFAULT_LIGHT_THEME);
  const [themeList, setThemeList] = useState(themes ?? []);

  useLayoutEffect(() => {
    applyThemeToDocument(currentTheme);
  }, [currentTheme]);

  const applyThemeById = useCallback(async (themeId: string) => {
    const res = await rendererGateway.applyTheme({ themeId });

    if (res?.status === 0) {
      setCurrentTheme(res.data);
      const nextThemes = await rendererGateway.listThemes();
      if (nextThemes?.status === 0) {
        setThemeList(nextThemes.data.themes);
      }
      return;
    }

    message.error(res?.message || '切换主题失败');
  }, []);

  const token = useMemo(() => deriveAntdToken(currentTheme, config), [config, currentTheme]);
  const contextValue = useMemo(
    () => ({
      activeTheme: currentTheme,
      themes: themeList,
      applyThemeById
    }),
    [applyThemeById, currentTheme, themeList]
  );

  return (
    <ThemeRuntimeContext.Provider value={contextValue}>
      <ConfigProvider prefixCls="_next_writer" theme={{ hashed: false, token }} locale={zhCN}>
        <App style={{ height: '100vh' }}>{children}</App>
      </ConfigProvider>
    </ThemeRuntimeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeRuntimeContext);
}
