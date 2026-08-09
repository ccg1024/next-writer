import { createRoot } from 'react-dom/client';
import Home from './home';
import { globalPreview } from './mix-components/image';
import { globalSpin } from './mix-components/spin';
import rendererGateway from './shared/ipc/renderer-gateway';
import { DEFAULT_LIGHT_THEME } from 'src/theme/theme-contract';
import { AppThemeProvider } from './domain/theme';

// 全局浮层脱离页面组件树，只挂载一次，供编辑器插件按需调用。
globalPreview.mount();
globalSpin.mount();

const root = createRoot(document.getElementById('root'));
// 首屏渲染前读取主题，避免先展示默认样式再发生闪烁。
rendererGateway.readConfig().then(res => {
  const data = res?.status === 0 ? res.data : null;

  root.render(
    <AppThemeProvider
      config={data?.config}
      themes={data?.themes}
      activeTheme={data?.activeTheme ?? DEFAULT_LIGHT_THEME}
    >
      <Home initialConfigData={data} />
    </AppThemeProvider>
  );
});
