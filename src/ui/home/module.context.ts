import { createContext, useContext, useMemo } from 'react';
import { ReadConfigResponse, RendererLibraryTree, RendererRootLibraryTree } from '_types';
import type { RuntimeRecord } from '../modules/store';
import { useLibraryActions, useLibraryState } from 'src/ui/domain/library';
import { useRuntimeLayout } from 'src/ui/domain/runtime';
import type { LibraryActions } from 'src/ui/domain/library';

type RenderConfig = ReadConfigResponse;

export interface Library {
  root: string;
  file: string;
}

export interface IHomeContext {
  libraryTree: RendererRootLibraryTree;
  updateRenderLibrary: (
    newNode: RendererLibraryTree | ((preLib: RendererLibraryTree, preNote: RendererLibraryTree) => RendererLibraryTree),
    type?: 'append' | 'remove' | 'update'
  ) => void;
  patchCurrentNote: LibraryActions['patchCurrentNote'];
  patchLibraryNode: LibraryActions['patchLibraryNode'];
  appendLibraryChild: LibraryActions['appendLibraryChild'];
  freshTree: () => void;
  runtimeConfig: RuntimeRecord;
}

const HomeContext = createContext<IHomeContext>(null);

export const useHomeContext = () => {
  const legacyContext = useContext(HomeContext);
  const { libraryTree } = useLibraryState();
  const { updateRenderLibrary, patchCurrentNote, patchLibraryNode, appendLibraryChild, freshTree } =
    useLibraryActions();
  const { runtimeConfig } = useRuntimeLayout();

  return useMemo(
    () =>
      legacyContext || {
        libraryTree,
        updateRenderLibrary,
        patchCurrentNote,
        patchLibraryNode,
        appendLibraryChild,
        freshTree,
        runtimeConfig
      },
    [
      appendLibraryChild,
      freshTree,
      legacyContext,
      libraryTree,
      patchCurrentNote,
      patchLibraryNode,
      runtimeConfig,
      updateRenderLibrary
    ]
  );
};

export default HomeContext;

interface IThemeContext {
  config: RenderConfig['config'];
}
const ThemeContext = createContext<IThemeContext>(null);

export const ThemeProvider = ThemeContext.Provider;

export const useThemeContext = () => useContext(ThemeContext);
