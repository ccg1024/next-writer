import { message } from 'antd';
import { useLayoutEffect, useState } from 'react';
import { isEffectArray, isEffectObject, isTrulyEmpty } from 'src/tools/utils';
import { LibraryTree, ReadConfigResponse } from '_types';
import mainProcess from '../libs/main-process';

/**
 * Generate a unique id for each lib struct (description of the file or folder) at runtime
 */
function generateLibId(libTree: LibraryTree) {
  if (isEffectObject(libTree)) {
    if (isTrulyEmpty(libTree.id)) {
      libTree.id = Math.random().toString(36).substring(2, 15);
    }

    if (isEffectArray(libTree.children)) {
      libTree.children.forEach(child => generateLibId(child));
    }
  }
}

/**
 * Using renderer process config
 */
const useRenderConfig = (): ReadConfigResponse | null => {
  const [renderConfig, setRenderConfig] = useState<ReadConfigResponse>(null);
  useLayoutEffect(() => {
    mainProcess.readConfig().then(res => {
      const { status, data, message: msg } = res || {};

      if (status === 0) {
        generateLibId(data.libTree);
        setRenderConfig(data);
      } else {
        message.error(msg || '读取配置失败');
      }
    });
  }, []);
  return renderConfig;
};

export default useRenderConfig;
