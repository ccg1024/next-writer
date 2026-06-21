import { createContext, useContext, useMemo } from 'react';
import { ReadConfigResponse, RendererLibraryTree } from '_types';
import type { RuntimeRecord } from '../modules/store';
import { useLibraryActions, useLibraryState } from 'src/ui/domain/library';
import { useRuntimeLayout } from 'src/ui/domain/runtime';

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
  const legacyContext = useContext(HomeContext);
  const { libraryTree } = useLibraryState();
  const { updateRenderLibrary, freshTree } = useLibraryActions();
  const { runtimeConfig } = useRuntimeLayout();

  return useMemo(
    () =>
      legacyContext || {
        libraryTree,
        updateRenderLibrary,
        freshTree,
        runtimeConfig
      },
    [freshTree, legacyContext, libraryTree, runtimeConfig, updateRenderLibrary]
  );
};

export default HomeContext;

interface IThemeContext {
  config: RenderConfig['config'];
}
const ThemeContext = createContext<IThemeContext>(null);

export const ThemeProvider = ThemeContext.Provider;

export const useThemeContext = () => useContext(ThemeContext);
