import styled from '@emotion/styled'
import { css } from '@emotion/css'
import { AnimatePresence, motion } from 'framer-motion'
import { FC, useState } from 'react'
import { TiThList } from 'react-icons/ti'
import { Post } from '../libs/utils'
import { ONE_WAY_CHANNEL } from 'src/config/ipc'

const ToolSpan = styled.span`
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

  const toggleSidebar = () => {
    // send message to main process
    Post(
      ONE_WAY_CHANNEL,
      {
        type: 'render-toggle-sidebar'
      },
      true
    )
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
            initial={{ right: -20, opacity: 0 }}
            animate={{ right: 0, opacity: 1 }}
            exit={{ right: -20, opacity: 0 }}
            className={css({
              backgroundColor: '#EDF2F7',
              width: '50px',
              padding: '10px 0',
              position: 'absolute',
              top: '20px',
              right: 0,
              userSelect: 'none',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--nw-box-shadow-sm)',
              justifyContent: 'center',
              alignItems: 'center'
            })}
            onMouseLeave={() => setVisible(false)}
          >
            <ToolSpan onClick={toggleSidebar}>
              <TiThList />
            </ToolSpan>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Toolbar
