import styled from '@emotion/styled'
import { css } from '@emotion/css'
import { AnimatePresence, motion } from 'framer-motion'
import { FC, useRef, useState } from 'react'
import { TiThList, TiArchive } from 'react-icons/ti'
import { Post } from '../libs/utils'
import { ONE_WAY_CHANNEL } from 'src/config/ipc'

const ToolSpan = styled.span`
  margin: 0 5px;
  padding: 2px;
  display: flex;
  :hover {
    border-radius: var(--nw-border-radius-sm);
    background-color: var(--nw-color-blackAlpha-200);
    cursor: pointer;
  }
`

const Toolbar: FC = () => {
  const [visible, setVisible] = useState(false)
  const timer = useRef<NodeJS.Timeout>(null)

  const toggleSidebar = () => {
    // send message to main process
    Post(ONE_WAY_CHANNEL, { type: 'render-toggle-sidebar' }, true)
  }
  const toggleHeadNav = () => {
    // send message to main process
    Post(ONE_WAY_CHANNEL, { type: 'render-toggle-headNav' }, true)
  }
  const cancleTimeout = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }
  const registeTimeout = () => {
    timer.current = setTimeout(() => {
      setVisible(false)
    }, 2000)
  }
  return (
    <>
      <div
        className={css({
          height: '20px',
          width: '50px',
          position: 'absolute',
          right: 0,
          top: 0,
          userSelect: 'none'
        })}
        onMouseEnter={() => setVisible(true)}
      ></div>
      <AnimatePresence initial={false} mode="wait">
        {visible && (
          <motion.div
            initial={{ top: -20, opacity: 0 }}
            animate={{ top: 0, opacity: 1 }}
            exit={{ top: -20, opacity: 0 }}
            className={css({
              boxSizing: 'border-box',
              backgroundColor: '#F7FAFC',
              width: '100%',
              padding: '5px',
              position: 'absolute',
              top: 0,
              right: 0,
              userSelect: 'none',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderBottom: '1px solid #ccc'
            })}
            onMouseLeave={registeTimeout}
            onMouseEnter={cancleTimeout}
          >
            <div
              className={css({
                lineHeight: 1,
                margin: 'auto'
              })}
            >
              {window._next_writer_rendererConfig.workpath || 'Untitled'}
            </div>
            <ToolSpan onClick={toggleSidebar}>
              <TiThList />
            </ToolSpan>
            <ToolSpan onClick={toggleHeadNav}>
              <TiArchive />
            </ToolSpan>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Toolbar
