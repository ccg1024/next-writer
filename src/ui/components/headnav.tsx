import React, { useEffect, useState, FC } from 'react'
import styled from '@emotion/styled'
import { css } from '@emotion/css'
import { HeadNav } from '_types'
import { pub, sub, unsub } from '../libs/pubsub'

// const HeadNavContainer = styled.div`
//   width: 200px;
//   padding-top: 10px;
//   padding-left: 10px;
//   overflow: auto;
//   flex-shrink: 0;
// `

type NavItemProps = {
  isActive: boolean
}

const NavItem = styled.div<NavItemProps>`
  overflow: hidden;
  text-overflow: ellipsis;
  text-wrap: nowrap;
  padding: 10px 5px;
  background-color: ${props =>
    props.isActive ? 'var(--nw-head-nav-item-color)' : 'unset'};
  font-weight: bold;
  &:hover {
    cursor: pointer;
    background-color: var(--nw-head-nav-item-color);
  }
`

interface HeadNavProps {
  visible: boolean
}
const HeadNav: FC<HeadNavProps> = props => {
  const [headers, setHeaders] = useState<Array<HeadNav>>([])
  const [section, setSection] = useState(1)
  useEffect(() => {
    // function listener(_: string, payload: PubSubData) {
    //   if (!payload) return
    //   if (payload.type === 'heads-list') {
    //     if (!payload.data) return
    //     const heads = (payload.data as unknown as { [key: string]: HeadNav[] })
    //       .heads
    //     setHeaders(heads)
    //   } else if (payload.type === 'top-head-line') {
    //     const line = payload.data as { [key: string]: number }
    //     setSection(line.line)
    //   }
    // }
    // const token = PubSub.subscribe('nw-head-nav-pubsub', listener)
    const token = sub('nw-head-nav-pubsub', (_, payload) => {
      if (!payload) return
      if (payload.type === 'heads-list') {
        if (!payload.data) return
        const heads = payload.data.heads
        setHeaders(heads)
      } else if (payload.type === 'top-head-line') {
        const line = payload.data
        setSection(line.line)
      }
    })

    return () => {
      // PubSub.unsubscribe(token)
      unsub(token)
    }
  }, [])

  function handleClick(e: React.MouseEvent) {
    const navitem = e.target as HTMLDivElement
    if (!navitem.id) return

    const jumpPos = parseInt(navitem.id.split('-')[1])
    // PubSub.publish('nw-editor-pubsub', { type: 'head-jump', data: { jumpPos } })
    pub('nw-editor-pubsub', { type: 'head-jump', data: { jumpPos } })
  }
  function getActiveLine(
    headers: Array<HeadNav>,
    section: number,
    visible: boolean
  ): [number, number] {
    if (!headers || !visible) return [1, 1]

    let activeLine, jumpPos

    for (let i = 0; i < headers.length; i++) {
      if (headers[i].number > section) break

      activeLine = headers[i].number
      jumpPos = headers[i].jumpPos
    }

    return [activeLine, jumpPos]
  }

  const [activeLine, jumpPos] = getActiveLine(headers, section, props.visible)
  useEffect(() => {
    if (!props.visible) return

    const div = document.getElementById(`navitem-${jumpPos}`)
    if (div)
      div.scrollIntoView({
        block: 'nearest'
      })
  }, [jumpPos, props.visible])
  return (
    <>
      {props.visible && (
        <div
          className={css({
            width: '200px',
            overflowX: 'hidden',
            overflowY: 'auto',
            flexShrink: 0,
            borderLeft: '1px solid #ccc'
          })}
          onClick={handleClick}
        >
          {headers.map((header, idx) => {
            const { title, level, jumpPos, number } = header
            const regularTitle = title.replace(/^(#+\s*)/, '')
            return (
              <NavItem
                id={`navitem-${jumpPos}`}
                key={idx}
                isActive={number === activeLine}
                style={{
                  marginLeft: `${10 * (level - 1)}px`,
                  color: regularTitle ? 'unset' : 'gray'
                }}
              >
                {regularTitle ? regularTitle : '[empty]'}
              </NavItem>
            )
          })}
        </div>
      )}
    </>
  )
}

export default HeadNav
