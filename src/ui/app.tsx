import { createRoot } from 'react-dom/client';
import { ConfigProvider, App } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Home from './home';
import { globalPreview } from './mix-components/image';
import { globalSpin } from './mix-components/spin';
import rendererGateway from './shared/ipc/renderer-gateway';
import { AliasToken } from 'antd/lib/theme/interface';

// Mount global image preveiw
globalPreview.mount();
globalSpin.mount();

const root = createRoot(document.getElementById('root'));
rendererGateway.readConfig().then(res => {
  const token = {} as AliasToken;
  if (res && res.status === 0) {
    const { config } = res.data;
    if (config?.uiFont) {
      token.fontFamily = config.uiFont;
    }
    if (config?.uiFontSize) {
      token.fontSize = parseInt(config.uiFontSize);
    }
  }
  root.render(
    <ConfigProvider prefixCls="_next_writer" theme={{ hashed: false, token }} locale={zhCN}>
      <App style={{ height: '100vh' }}>
        <Home />
      </App>
    </ConfigProvider>
  );
});
