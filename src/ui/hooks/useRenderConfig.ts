import { message } from 'antd';
import { useLayoutEffect, useState } from 'react';
import mainProcess from '../libs/main-process';

/**
 * Using renderer process config
 */
const useRenderConfig = () => {
  const [renderConfig, setRenderConfig] = useState(null);
  useLayoutEffect(() => {
    mainProcess.readConfig().then(res => {
      const { status, data, message: msg } = res || {};

      if (status === 0) {
        setRenderConfig(data ?? {});
      } else {
        message.error(msg || '读取配置失败');
      }
    });
  }, []);
  return renderConfig;
};

export default useRenderConfig;
