import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import type { RuntimeRecord } from 'src/ui/modules/store';

type RuntimeState = {
  runtimeConfig: RuntimeRecord;
  librarySidebarVisible: boolean;
  detailSidebarVisible: boolean;
  tocVisible: boolean;
};

type RuntimeAction =
  | { type: 'set-runtime-config'; runtimeConfig: RuntimeRecord }
  | { type: 'set-library-sidebar-visible'; visible: boolean }
  | { type: 'set-detail-sidebar-visible'; visible: boolean }
  | { type: 'set-toc-visible'; visible: boolean };

type RuntimeLayout = RuntimeState & {
  setRuntimeConfig: (runtimeConfig: RuntimeRecord) => void;
  setLibrarySidebarVisible: (visible: boolean) => void;
  setDetailSidebarVisible: (visible: boolean) => void;
  setTocVisible: (visible: boolean) => void;
};

const RuntimeLayoutContext = createContext<RuntimeLayout | null>(null);

const initialRuntimeState: RuntimeState = {
  runtimeConfig: null,
  librarySidebarVisible: true,
  detailSidebarVisible: true,
  tocVisible: false
};

function runtimeReducer(state: RuntimeState, action: RuntimeAction): RuntimeState {
  switch (action.type) {
    case 'set-runtime-config':
      return {
        runtimeConfig: action.runtimeConfig,
        librarySidebarVisible: action.runtimeConfig?.menuStatus?.librarySidebar ?? state.librarySidebarVisible,
        detailSidebarVisible: action.runtimeConfig?.menuStatus?.detailSidebar ?? state.detailSidebarVisible,
        tocVisible: state.tocVisible
      };
    case 'set-library-sidebar-visible':
      return { ...state, librarySidebarVisible: action.visible };
    case 'set-detail-sidebar-visible':
      return { ...state, detailSidebarVisible: action.visible };
    case 'set-toc-visible':
      return { ...state, tocVisible: action.visible };
    default:
      return state;
  }
}

export function RuntimeProvider({ children }: React.PropsWithChildren) {
  const [state, dispatch] = useReducer(runtimeReducer, initialRuntimeState);

  const setRuntimeConfig = useCallback((runtimeConfig: RuntimeRecord) => {
    dispatch({ type: 'set-runtime-config', runtimeConfig });
  }, []);

  const setLibrarySidebarVisible = useCallback((visible: boolean) => {
    dispatch({ type: 'set-library-sidebar-visible', visible });
  }, []);

  const setDetailSidebarVisible = useCallback((visible: boolean) => {
    dispatch({ type: 'set-detail-sidebar-visible', visible });
  }, []);

  const setTocVisible = useCallback((visible: boolean) => {
    dispatch({ type: 'set-toc-visible', visible });
  }, []);

  const value = useMemo<RuntimeLayout>(
    () => ({
      ...state,
      setRuntimeConfig,
      setLibrarySidebarVisible,
      setDetailSidebarVisible,
      setTocVisible
    }),
    [setDetailSidebarVisible, setLibrarySidebarVisible, setRuntimeConfig, setTocVisible, state]
  );

  return <RuntimeLayoutContext.Provider value={value}>{children}</RuntimeLayoutContext.Provider>;
}

export function useRuntimeLayout() {
  const value = useContext(RuntimeLayoutContext);
  if (!value) {
    throw new Error('useRuntimeLayout must be used within RuntimeProvider');
  }
  return value;
}
