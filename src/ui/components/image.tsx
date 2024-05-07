import PubSub from 'pubsub-js'
import { FC, useEffect, useRef, useState } from 'react'
import { css } from '@emotion/css'
import { createPortal } from 'react-dom'
import { TiZoomInOutline, TiZoomOutOutline } from 'react-icons/ti'
import { PubSubData } from '_types'
import { motion } from 'framer-motion'

export const HoverImage: FC = () => {
  const [visible, setVisible] = useState(false)
  const [src, setSrc] = useState<string>(null)
  const refImag = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const func = (_: string, payload: PubSubData) => {
      if (!payload) return

      if (payload.type === 'show-hover-image') {
        if (!payload.data.src || typeof payload.data.src !== 'string') return
        setSrc(payload.data.src)
        setVisible(true)
      }
    }
    const token = PubSub.subscribe('nw-hover-image-pubsub', func)

    return () => {
      PubSub.unsubscribe(token)
    }
  }, [])

  const growImg = () => {
    if (!refImag.current) return

    refImag.current.width += 100
  }
  const shrinkImg = () => {
    if (!refImag.current) return

    refImag.current.width -= 100
  }
  const dom = visible && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      id="hover-image-container"
      className={css({
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 100
      })}
    >
      <div
        id="hover-image-mask"
        className={css({
          position: 'absolute',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          backgroundColor: 'rgba(0,0,0,0.5)'
        })}
        onClick={() => setVisible(false)}
      ></div>
      <div
        className={css({
          position: 'relative',
          marginTop: '10vh',
          marginLeft: '10vw',
          width: '80%',
          height: '80%',
          boxSizing: 'border-box',
          zIndex: 100,
          overflow: 'auto',
          borderRadius: '5px'
        })}
      >
        <img
          ref={refImag}
          src={src}
          width="100%"
          className={css({
            display: 'block',
            borderRadius: '5px',
            margin: 'auto'
          })}
        />
      </div>
      <div
        className={css({
          display: 'flex',
          gap: '5px',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 100
        })}
      >
        <TiZoomOutOutline
          onClick={shrinkImg}
          className={css({
            fontSize: '30px',
            color: 'white',
            borderRadius: 'var(--nw-border-radius-sm)',
            ':hover': {
              cursor: 'pointer',
              backgroundColor: 'var(--nw-color-whiteAlpha-100)'
            }
          })}
        />
        <TiZoomInOutline
          onClick={growImg}
          className={css({
            transform: 'rotateY(180deg)',
            fontSize: '30px',
            color: 'white',
            borderRadius: 'var(--nw-border-radius-sm)',
            ':hover': {
              cursor: 'pointer',
              backgroundColor: 'var(--nw-color-whiteAlpha-100)'
            }
          })}
        />
      </div>
    </motion.div>
  )
  return createPortal(dom, document.body)
}
