import { createContext } from 'react';
import { ReadConfigResponse } from '_types';

type RenderConfig = ReadConfigResponse;

interface IThemeContext {
  config: RenderConfig['config'];
}
const ThemeContext = createContext<IThemeContext>(null);

export const ThemeProvider = ThemeContext.Provider;
