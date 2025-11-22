import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { isEffectArray, isEffectObject } from 'src/tools/utils';
import { generateRuntimeInfo } from '../libs/utils';
import renderStore from '../modules/store';
import type { RuntimeRecord } from '../modules/store';

import './index.css';

// 全局记录当前展示的文件与文件夹
let currenNote_: RendererLibraryTree = null;
let currentLib_: RendererLibraryTree = null;

const Home = () => {
  const [renderConfig, setRenderConfig] = useState(null);
  const [libraryTree, setLibraryTree] = useState<RendererLibraryTree>(null);
  const [currentLib, setCurrentLib] = useState<RendererLibraryTree>(null);
  const [currentNote, setCurrentNote] = useState<RendererLibraryTree>(null);
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
        generateRuntimeInfo(libTree, null);
        setLibraryTree(libTree);

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

  useEffect(() => {
    currenNote_ = currentNote;
    currentLib_ = currentLib;

    return () => {
      currenNote_ = null;
      currentLib_ = null;
    };
  }, [currentLib, currentNote]);

  // 变更文件该方法
  const updateRenderLibrary: IHomeContext['updateRenderLibrary'] = useCallback((newNode, type = 'update') => {
    const innerNode = typeof newNode === 'function' ? newNode(currentLib_, currenNote_) : newNode;
    const parent = innerNode.parent;
    if (isEffectObject(parent)) {
      parent.children = !isEffectArray(parent.children)
        ? parent.children
        : parent.children
            .map(child => {
              if (child.id === innerNode.id) {
                return type === 'remove' ? undefined : innerNode;
              }
              return child;
            })
            .filter(child => child);
    }

    // 如果要进行多级文件夹嵌套，这个地方还是有点问题的
    setLibraryTree(pre => {
      // 文件夹变更，刷新文件树
      if (parent === pre) {
        const newTree = { ...pre };
        newTree.children.forEach(child => (child.parent = newTree));
        return newTree;
      }
      return pre;
    });

    // 文件变更总会走这里
    if (innerNode.id === currenNote_?.id) {
      setCurrentNote(type === 'remove' ? null : innerNode);
    } else if (innerNode.id === currentLib_?.id) {
      setCurrentLib(type === 'remove' ? null : innerNode);
    }
  }, []);

  const themeConfig = useMemo(() => ({ config: renderConfig }), [renderConfig]);
  const homeValue = useMemo(
    () => ({
      libraryTree,
      updateRenderLibrary,
      freshTree() {
        setLibraryTree(pre => {
          if (pre) {
            const newTree = { ...pre };
            newTree.children.forEach(child => (child.parent = newTree));
            return newTree;
          }
          return pre;
        });
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
