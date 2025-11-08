import { createContext, useContext } from 'react';
import { ReadConfigResponse, RendererLibraryTree } from '_types';

type RenderConfig = ReadConfigResponse;

export interface Library {
  root: string;
  file: string;
}

export interface IHomeContext {
  libraryTree: RendererLibraryTree;
  updateRenderLibrary: (
    newNode: RendererLibraryTree | ((preLib: RendererLibraryTree, preNote: RendererLibraryTree) => RendererLibraryTree),
    type?: 'remove' | 'update'
  ) => void;
  freshTree: () => void;
}

const HomeContext = createContext<IHomeContext>(null);

export const useHomeContext = () => {
  return useContext(HomeContext);
};

export default HomeContext;

interface IThemeContext {
  config: RenderConfig['config'];
}
const ThemeContext = createContext<IThemeContext>(null);

export const ThemeProvider = ThemeContext.Provider;

export const useThemeContext = () => useContext(ThemeContext);
