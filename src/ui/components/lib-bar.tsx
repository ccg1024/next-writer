import { css } from '@emotion/css'
import { FC } from 'react'
import Library from './library'

const Drag: FC = (): JSX.Element => {
  return (
    <div
      className={css`
        height: 40px;
        flex-shrink: 0;
        flex-grow: 0;
        -webkit-app-region: drag;
      `}
    ></div>
  )
}

interface LibBarProps {
  visible: boolean
}
const LibBar: FC<LibBarProps> = ({ visible }): JSX.Element => {
  return (
    <>
      {visible && (
        <div
          className={css({
            flexShrink: 0,
            width: '220px'
          })}
        >
          <Drag />
          <Library />
        </div>
      )}
    </>
  )
}

export default LibBar
