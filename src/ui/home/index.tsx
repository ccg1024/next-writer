import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import { ReadConfigResponse, RendererRootLibraryTree } from '_types';
import { BaseLayout } from '../modules/layout';
import LibrarySidebar from '../features/library-workspace';
import Main from '../modules/main';
import { ThemeProvider } from './module.context';
import PluginGlobal from '../plugins/global';
import Outline from '../modules/outline';
import rendererGateway from 'src/ui/shared/ipc/renderer-gateway';
import renderStore from '../modules/store';
import { LibraryProvider, useLibraryActions } from 'src/ui/domain/library';
import { RuntimeProvider, useRuntimeLayout } from 'src/ui/domain/runtime';
import { EditorProvider } from 'src/ui/domain/editor';
import { rendererIpcListener } from 'src/ui/shared/renderer-command';

import './index.css';

type HomeProps = {
  initialConfigData?: ReadConfigResponse | null;
};

/** 组合渲染进程的运行时、文库和编辑器状态域。 */
const Home = ({ initialConfigData }: HomeProps) => {
  return (
    <RuntimeProvider>
      <LibraryProvider>
        <EditorProvider>
          <HomeContent initialConfigData={initialConfigData} />
        </EditorProvider>
      </LibraryProvider>
    </RuntimeProvider>
  );
};

const HomeContent = ({ initialConfigData }: HomeProps) => {
  const [renderConfig, setRenderConfig] = useState(null);
  const { setLibraryTree } = useLibraryActions();
  const { setRuntimeConfig } = useRuntimeLayout();

  /** 将主进程配置同时投影到 React 状态、文库树与编辑器 CSS 变量。 */
  useLayoutEffect(() => {
    const applyConfig = (data: ReadConfigResponse) => {
      const { config, libTree } = data;
      setRenderConfig(config);

      setLibraryTree(libTree as RendererRootLibraryTree);

      // 字体配置使用 CSS 变量下发，避免编辑器扩展因配置变化而整体重建。
      const r = document.querySelector('body');
      const c = config ?? {};
      if (c.codeFont) {
        r.style.setProperty('--nw-editor-code-font-family', c.codeFont as string);
      }
      if (c.editorFont) {
        r.style.setProperty('--nw-editor-font-family', c.editorFont as string);
      }
      if (c.editorFontSize) {
        r.style.setProperty('--nw-editor-font-size', c.editorFontSize as string);
      }
    };

    if (initialConfigData) {
      applyConfig(initialConfigData);
      return;
    }

    rendererGateway.readConfig().then(res => {
      const { status, data, message: msg } = res || {};

      if (status === 0) {
        applyConfig((data ?? {}) as ReadConfigResponse);
      } else {
        message.error(msg || '读取配置失败');
      }
    });
  }, [initialConfigData, setLibraryTree]);

  useEffect(() => {
    rendererGateway.queryRuntimeConfig().then(res => {
      if (res?.status === 0) {
        renderStore.runtime = res.data;
        setRuntimeConfig(res.data);
      }
    });
  }, [setRuntimeConfig]);

  // 页面存活期间统一接收菜单等主进程命令，各组件通过 useRendererCommand 订阅。
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
      // CodeMirror 装饰插件无法直接依赖 React 上下文，缓存计算后的实际字体供其读取。
      PluginGlobal.set('font', window.getComputedStyle(ref.current).font);
    }
  }, []);
  return <span ref={ref} id="nw-measure" style={{ display: 'none', fontFamily: 'monospace' }}></span>;
}

export default Home;
