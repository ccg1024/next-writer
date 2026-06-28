import { createRoot } from 'react-dom/client';
import Home from './home';
import { globalPreview } from './mix-components/image';
import { globalSpin } from './mix-components/spin';
import rendererGateway from './shared/ipc/renderer-gateway';
import { DEFAULT_LIGHT_THEME } from 'src/theme/theme-contract';
import { AppThemeProvider } from './domain/theme';

// Mount global image preveiw
globalPreview.mount();
globalSpin.mount();

const root = createRoot(document.getElementById('root'));
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
