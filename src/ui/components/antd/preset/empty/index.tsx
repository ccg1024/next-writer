import { Empty } from 'antd';
import { FC } from 'react';

import './index.less';

type EmptyProps = Parameters<typeof Empty>[0];
export const VerticalEmpty: FC<EmptyProps> = props => {
  return <Empty className="preset-vertical-empty" {...props} />;
};
