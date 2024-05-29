import { css } from '@emotion/css'
import { AnimatePresence, motion } from 'framer-motion'
import { FC } from 'react'
import Library from './library'

const Drag: FC = (): JSX.Element => {
  return (
    <div
      className={css`
        height: 30px;
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
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '220px', opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={css({
            flexShrink: 0
          })}
        >
          <Drag />
          <Library />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default LibBar
