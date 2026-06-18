import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { message } from 'antd';
import { ReadConfigResponse, RendererLibraryTree } from '_types';
import { BaseLayout } from '../modules/layout';
import LibrarySidebar from '../modules/library-sidebar';
import Main from '../modules/main';
import HomeContext, { IHomeContext, ThemeProvider } from './module.context';
import rendererIpcListener from '../modules/ipc';
import PluginGlobal from '../plugins/global';
import Outline from '../modules/outline';
import mainProcess from '../libs/main-process';
import {
  findRendererNodeById,
  refreshRendererTree,
  RendererTreeOperation,
  updateRendererTree
} from '../libs/renderer-tree';
import renderStore from '../modules/store';
import type { RuntimeRecord } from '../modules/store';

import './index.css';

type LibraryState = {
  libraryTree: RendererLibraryTree;
  currentLib: RendererLibraryTree;
  currentNote: RendererLibraryTree;
};

type LibraryAction =
  | { type: 'fresh-tree' }
  | { type: 'set-current-lib'; node: RendererLibraryTree }
  | { type: 'set-current-note'; node: RendererLibraryTree }
  | { type: 'set-library-tree'; tree: RendererLibraryTree }
  | {
      type: 'update-node';
      newNode:
        | RendererLibraryTree
        | ((preLib: RendererLibraryTree, preNote: RendererLibraryTree) => RendererLibraryTree);
      operation: RendererTreeOperation;
    };

const initialLibraryState: LibraryState = {
  libraryTree: null,
  currentLib: null,
  currentNote: null
};

function libraryReducer(state: LibraryState, action: LibraryAction): LibraryState {
  switch (action.type) {
    case 'set-library-tree':
      return {
        libraryTree: refreshRendererTree(action.tree),
        currentLib: null,
        currentNote: null
      };
    case 'set-current-lib':
      return { ...state, currentLib: action.node };
    case 'set-current-note':
      return { ...state, currentNote: action.node };
    case 'fresh-tree': {
      if (!state.libraryTree) {
        return state;
      }
      const libraryTree = refreshRendererTree(state.libraryTree);
      return syncSelectedNodes(state, libraryTree);
    }
    case 'update-node': {
      const innerNode =
        typeof action.newNode === 'function' ? action.newNode(state.currentLib, state.currentNote) : action.newNode;
      if (!state.libraryTree || !innerNode) {
        return state;
      }
      const libraryTree = updateRendererTree(state.libraryTree, innerNode, action.operation);
      return syncSelectedNodes(state, libraryTree);
    }
    default:
      return state;
  }
}

function syncSelectedNodes(state: LibraryState, libraryTree: RendererLibraryTree): LibraryState {
  return {
    libraryTree,
    currentLib: findRendererNodeById(libraryTree, state.currentLib?.id),
    currentNote: findRendererNodeById(libraryTree, state.currentNote?.id)
  };
}

const Home = () => {
  const [renderConfig, setRenderConfig] = useState(null);
  const [{ libraryTree, currentLib, currentNote }, dispatchLibraryAction] = useReducer(
    libraryReducer,
    initialLibraryState
  );
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeRecord>(null);

  // ============================================================
  // Effects
  // ============================================================
  useLayoutEffect(() => {
    mainProcess.readConfig().then(res => {
      const { status, data, message: msg } = res || {};

      if (status === 0) {
        const { config, libTree } = (data ?? {}) as ReadConfigResponse;
        setRenderConfig(config);

        // Generating information
        dispatchLibraryAction({ type: 'set-library-tree', tree: libTree as RendererLibraryTree });

        // change css variable
        const r = document.querySelector('body');
        const c = config ?? {};
        if (c.codeFont) {
          r.style.setProperty('--nw-editor-code-font-family', c.codeFont);
        }
        if (c.editorFont) {
          r.style.setProperty('--nw-editor-font-family', c.editorFont);
        }
        if (c.editorFontSize) {
          r.style.setProperty('--nw-editor-font-size', c.editorFontSize);
        }
      } else {
        message.error(msg || '读取配置失败');
      }
    });
  }, []);

  useEffect(() => {
    mainProcess.queryRuntimeConfig().then(res => {
      if (res?.status === 0) {
        renderStore.runtime = res.data;
        setRuntimeConfig(res.data);
      }
    });
  }, []);

  // Start listen ipc event
  useEffect(() => {
    rendererIpcListener.start();

    return () => {
      rendererIpcListener.stop();
    };
  }, []);

  // 变更文件该方法
  const updateRenderLibrary: IHomeContext['updateRenderLibrary'] = useCallback((newNode, type = 'update') => {
    dispatchLibraryAction({ type: 'update-node', newNode, operation: type });
  }, []);

  const setCurrentLib = useCallback((node: RendererLibraryTree) => {
    dispatchLibraryAction({ type: 'set-current-lib', node });
  }, []);

  const setCurrentNote = useCallback((node: RendererLibraryTree) => {
    dispatchLibraryAction({ type: 'set-current-note', node });
  }, []);

  const themeConfig = useMemo(() => ({ config: renderConfig }), [renderConfig]);
  const homeValue = useMemo(
    () => ({
      libraryTree,
      updateRenderLibrary,
      freshTree() {
        dispatchLibraryAction({ type: 'fresh-tree' });
      },
      runtimeConfig
    }),
    [libraryTree, updateRenderLibrary, runtimeConfig]
  );

  return (
    <ThemeProvider value={themeConfig}>
      <HomeContext.Provider value={homeValue}>
        <BaseLayout>
          {/* Show lib bar and detail bar of current lib */}
          <LibrarySidebar
            currentLib={currentLib}
            setCurrentLib={setCurrentLib}
            currentNote={currentNote}
            setCurrentNote={setCurrentNote}
          />
          {/* Show current note */}
          <Main currentNote={currentNote} />
          <Outline />
        </BaseLayout>
        <FontMeasure />
      </HomeContext.Provider>
    </ThemeProvider>
  );
};

function FontMeasure() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (ref.current) {
      PluginGlobal.set('font', window.getComputedStyle(ref.current).font);
    }
  }, []);
  return <span ref={ref} id="nw-measure" style={{ display: 'none', fontFamily: 'monospace' }}></span>;
}

export default Home;
