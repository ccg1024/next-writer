import { createContext, useContext } from 'react';
import { ReadConfigResponse, RendererLibraryTree } from '_types';
import type { RuntimeRecord } from '../modules/store';

type RenderConfig = ReadConfigResponse;

export interface Library {
  root: string;
  file: string;
}

export interface IHomeContext {
  libraryTree: RendererLibraryTree;
  updateRenderLibrary: (
    newNode: RendererLibraryTree | ((preLib: RendererLibraryTree, preNote: RendererLibraryTree) => RendererLibraryTree),
    type?: 'append' | 'remove' | 'update'
  ) => void;
  freshTree: () => void;
  runtimeConfig: RuntimeRecord;
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
