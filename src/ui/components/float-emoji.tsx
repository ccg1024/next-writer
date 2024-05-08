import { css } from '@emotion/css'
import { FC, MouseEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import twemoji from 'twemoji'

import { emojiList } from '../libs/utils'
import { pub, sub, unsub } from '../libs/pubsub'

const Emoji = () => {
  const refEmoji = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!refEmoji.current) return

    const { current: container } = refEmoji

    const emojiCls = css({
      height: '20px',
      width: '20px',
      transition: 'all 0.25s linear',
      '&:hover': {
        transform: 'scale(1.4)'
      }
    })
    const spanCls = css({
      height: '20px',
      width: '20px',
      display: 'inline-flex',
      placeSelf: 'center'
    })

    emojiList.forEach((e, idx) => {
      const span = document.createElement('span')
      span.setAttribute('aria-hidden', 'true')
      span.setAttribute('class', spanCls)
      span.setAttribute('data-id', idx.toString())
      const _emoji = twemoji.parse(e, {
        base: 'static://',
        folder: 'svg',
        ext: '.svg',
        className: emojiCls
      })
      span.innerHTML = _emoji
      span.setAttribute('alt', e)
      container.appendChild(span)
    })
  }, [])

  const wrapCls = css({
    padding: '10px',
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gridRowGap: '5px'
  })

  const click = (e: MouseEvent) => {
    const target = e.target as HTMLElement

    if (!['SPAN', 'IMG'].includes(target.tagName)) return

    const _emoji = target.getAttribute('alt')
    // PubSub.publish('nw-editor-pubsub', {
    //   type: 'insert-emoji',
    //   data: { emoji: _emoji }
    // })
    pub('nw-editor-pubsub', { type: 'insert-emoji', data: { emoji: _emoji } })
  }

  return <div className={wrapCls} ref={refEmoji} onClick={click}></div>
}

interface FloatEmojiProps {
  width?: number
  height?: number
}

const FloatEmoji: FC<FloatEmojiProps> = props => {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 10,
    left: 400
  })

  useEffect(() => {
    // const listener = (_: string, payload: PubSubData) => {
    //   if (payload.type === 'close') {
    //     setVisible(false)
    //   } else if (payload.type === 'open') {
    //     const pos = payload.data as { top: number; left: number }
    //     setVisible(true)
    //     setPosition(pos)
    //   }
    // }
    // const token = PubSub.subscribe('nw-float-emoji-pubsub', listener)
    const token = sub('nw-float-emoji-pubsub', (_, payload) => {
      if (payload.type === 'close') {
        setVisible(false)
      } else if (payload.type === 'open') {
        const { top, left } = payload.data
        setVisible(true)
        setPosition({ top, left })
      }
    })

    // add click close
    function clickClose() {
      setVisible(false)
    }

    document.addEventListener('mousedown', clickClose)

    return () => {
      // PubSub.unsubscribe(token)
      unsub(token)
      document.removeEventListener('mousedown', clickClose)
    }
  }, [])

  const styles = () => {
    const width = typeof props.width === 'number' ? props.width : 200
    const height = typeof props.height === 'number' ? props.height : 200

    return {
      width,
      height
    }
  }

  const wrapCls = css({
    position: 'absolute',
    backgroundColor: 'white',
    overflow: 'auto',
    boxShadow: 'var(--nw-box-shadow-md)',
    borderRadius: 'var(--nw-border-radius-md)',
    left: position.left + 'px',
    top: position.top + 'px'
  })

  const floatEmoji = (
    <>
      {visible && (
        <div className={wrapCls} style={{ ...styles() }}>
          <Emoji />
        </div>
      )}
    </>
  )

  return createPortal(floatEmoji, document.body)
}

export default FloatEmoji
