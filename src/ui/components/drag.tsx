import { FC } from 'react';
import { createPortal } from 'react-dom';
import styled from '@emotion/styled';
import { css } from '@emotion/css';

const DragBar = styled.div`
  width: 10vw;
  height: 10vh;
  position: absolute;
  top: 0;
  left: 0;
  -webkit-app-region: drag;
`;

const Drag: FC = (): JSX.Element => {
  return createPortal(<DragBar />, document.body);
};

export default Drag;

export const WindowDragBox: FC<React.HTMLAttributes<HTMLDivElement>> = props => {
  const { className, ...restProps } = props;
  const innerCss = css(`
  height: 20px;
  -webkit-app-region: drag;
`);
  return <div className={`${innerCss} ${className ?? ''}`} {...restProps} aria-label="window-drag-box"></div>;
};
