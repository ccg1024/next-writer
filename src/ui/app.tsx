import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
// import Home from './components/home'
import Home from './home';

// initial global var
window._next_writer_rendererConfig = {
  workpath: '', // The path to which the editor edits the file
  modified: false,
  preview: false,
  plugin: {}
};

const root = createRoot(document.getElementById('root'));
root.render(
  <ConfigProvider prefixCls="_next_writer" theme={{ hashed: false }}>
    <Home />
  </ConfigProvider>
);
