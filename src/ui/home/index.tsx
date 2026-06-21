import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import { ReadConfigResponse, RendererLibraryTree } from '_types';
import { BaseLayout } from '../modules/layout';
import LibrarySidebar from '../modules/library-sidebar';
import Main from '../modules/main';
import { ThemeProvider } from './module.context';
import rendererIpcListener from '../modules/ipc';
import PluginGlobal from '../plugins/global';
import Outline from '../modules/outline';
import rendererGateway from 'src/ui/shared/ipc/renderer-gateway';
import renderStore from '../modules/store';
import { LibraryProvider, useLibraryActions } from 'src/ui/domain/library';
import { RuntimeProvider, useRuntimeLayout } from 'src/ui/domain/runtime';
import { EditorProvider } from 'src/ui/domain/editor';

import './index.css';

const Home = () => {
  return (
    <RuntimeProvider>
      <LibraryProvider>
        <EditorProvider>
          <HomeContent />
        </EditorProvider>
      </LibraryProvider>
    </RuntimeProvider>
  );
};

const HomeContent = () => {
  const [renderConfig, setRenderConfig] = useState(null);
  const { setLibraryTree } = useLibraryActions();
  const { setRuntimeConfig } = useRuntimeLayout();

  // ============================================================
  // Effects
  // ============================================================
  useLayoutEffect(() => {
    rendererGateway.readConfig().then(res => {
      const { status, data, message: msg } = res || {};

      if (status === 0) {
        const { config, libTree } = (data ?? {}) as ReadConfigResponse;
        setRenderConfig(config);

        // Generating information
        setLibraryTree(libTree as RendererLibraryTree);

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
  }, [setLibraryTree]);

  useEffect(() => {
    rendererGateway.queryRuntimeConfig().then(res => {
      if (res?.status === 0) {
        renderStore.runtime = res.data;
        setRuntimeConfig(res.data);
      }
    });
  }, [setRuntimeConfig]);

  // Start listen ipc event
  useEffect(() => {
    rendererIpcListener.start();

    return () => {
      rendererIpcListener.stop();
    };
  }, []);

  const themeConfig = useMemo(() => ({ config: renderConfig }), [renderConfig]);

  return (
    <ThemeProvider value={themeConfig}>
      <BaseLayout>
        {/* Show lib bar and detail bar of current lib */}
        <LibrarySidebar />
        {/* Show current note */}
        <Main />
        <Outline />
      </BaseLayout>
      <FontMeasure />
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
