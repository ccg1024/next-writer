import PubSub from 'pubsub-js'
import styled from '@emotion/styled'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimateHoverBoxCoords } from './utils'
import { PubSubData } from '_types'

const MessBody = styled.div`
  padding: 10px;
  background-color: white;
  border-radius: var(--nw-border-radius-md);
  box-shadow: var(--nw-box-shadow-md);
`
const Message = () => {
  const [visible, setVisible] = useState(false)
  const [mess, setMess] = useState('')

  useEffect(() => {
    const token = PubSub.subscribe(
      'nw-show-message',
      (_: string, payload: PubSubData) => {
        if (payload.data.message) {
          setMess(payload.data.message as string)
          setVisible(true)
          setTimeout(() => {
            setVisible(false)
          }, 3000)
        }
      }
    )

    return () => {
      PubSub.unsubscribe(token)
    }
  })

  const mssJSX = (
    <AnimateHoverBoxCoords x="right" y="top" yOffset={'20px'} xOffset={'10px'}>
      <AnimatePresence mode="wait" initial={false}>
        {visible && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <MessBody>{mess}</MessBody>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimateHoverBoxCoords>
  )
  return createPortal(mssJSX, document.body)
}

export default Message
