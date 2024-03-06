import { FC } from 'react'
import { createPortal } from 'react-dom'
import styled from '@emotion/styled'

const DragBar = styled.div`
  background-color: blue;
  width: 100px;
  height: 40px;
  position: absolute;
  top: 0;
  left: 0;
  opacity: 0;
  -webkit-app-region: drag;
`

const Drag: FC = (): JSX.Element => {
  return createPortal(<DragBar />, document.body)
}

export default Drag
