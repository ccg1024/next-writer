import { FC } from 'react';
import './index.less';

export const BaseLayout: FC<React.PropsWithChildren> = ({ children }) => {
  return <div className="base-layout-wrapper">{children}</div>;
};
