import { createRoot } from 'react-dom/client';
import { ConfigProvider, App } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Home from './home';
import { globalPreview } from './mix-components/image';
import { globalSpin } from './mix-components/spin';
import mainProcess from './libs/main-process';
import { AliasToken } from 'antd/lib/theme/interface';

// initial global var
// 感觉没怎用，看后面要不要删掉；已经不再采用再全局对象上挂载属性的方式共享全局变量
window._next_writer_rendererConfig = {
  workpath: '', // The path to which the editor edits the file
  modified: false,
  preview: false,
  plugin: {}
};

// Mount global image preveiw
globalPreview.mount();
globalSpin.mount();

const root = createRoot(document.getElementById('root'));
mainProcess.readConfig().then(res => {
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
