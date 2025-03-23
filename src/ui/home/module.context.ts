import { createContext, useContext } from 'react';
import { ReadConfigResponse } from '_types';

type RenderConfig = ReadConfigResponse;

export interface Library {
  root: string;
  file: string;
}

export interface IHomeContext {
  currentLib: Library;
  renderConfig: RenderConfig;
  setCurrentLib: (lib: Library) => void;
}

const HomeContext = createContext<IHomeContext>(null);

export const useHomeContext = () => {
  return useContext(HomeContext);
};

// There is no need to use this context yet.
export default HomeContext;

interface IThemeContext {
  config: RenderConfig['config'];
}
const ThemeContext = createContext<IThemeContext>(null);

export const ThemeProvider = ThemeContext.Provider;

export const useThemeContext = () => useContext(ThemeContext);
