import { FC, useState } from 'react'
import { AnimateHoverBox } from './utils'

interface Props {
  currentFile: string
}

const BroadCast: FC<Props> = (props): JSX.Element => {
  const [showHover, setShowHover] = useState(false)

  function makeBroadcast(path: string) {
    return path.split('/').reverse().join('/')
  }
  function toggleHover() {
    setShowHover(v => !v)
  }
  return (
    <div className="broadcast-main">
      <div className="broadcast-content" onClick={toggleHover}>
        {props.currentFile ? makeBroadcast(props.currentFile) : 'next Writer'}
      </div>
      <AnimateHoverBox
        visible={showHover}
        x="right"
        y="top"
        yOffset={'20px'}
        nTranslate={'100%, 0'}
        zIndex={100}
      >
        {props.currentFile ? props.currentFile : 'next Writer'}
      </AnimateHoverBox>
    </div>
  )
}

export default BroadCast
