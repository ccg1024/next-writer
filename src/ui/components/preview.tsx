import { FC, useEffect, useRef } from 'react'
import { css } from '@emotion/css'
import useProcessor from '../hooks/useProcessor'

import 'katex/dist/katex.css'
import { sub, unsub } from '../libs/pubsub'

interface PreviewProps {
  doc: string
  visible: boolean
  hideEditor: boolean
}
function binarySearchDom(
  arr: HTMLCollection,
  line: number
): null | HTMLElement {
  if (arr.length == 0) return null

  let low = 0
  let high = arr.length
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const lineInfo = (arr[mid] as HTMLElement).dataset as {
      start: string
      end: string
    }
    const start = parseInt(lineInfo.start)
    const end = lineInfo.end ? parseInt(lineInfo.end) : -1

    if (start == line || (start < line && line <= end)) {
      return arr[mid] as HTMLElement
    } else if (start < line) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return null
}
const Preview: FC<PreviewProps> = props => {
  const refContainer = useRef<HTMLDivElement>(null)
  const refWrapper = useRef<HTMLDivElement>(null)
  const { doc } = props
  const content = useProcessor(doc, props.visible)

  useEffect(() => {
    // const listener = (_: string, payload: PubSubData) => {
    //   if (payload.type == 'sync-scroll') {
    //     if (!refContainer.current) return
    //
    //     const { line, percent } = payload.data as {
    //       line: number
    //       percent: number
    //     }
    //     const doms = refContainer.current.children
    //     const target = binarySearchDom(doms, line)
    //     if (!target) return
    //
    //     let additional = target.offsetHeight * percent
    //     // check whether is a block wrapper
    //     if (target.dataset.end) {
    //       const lines =
    //         Number(target.dataset.end) - Number(target.dataset.start) + 1
    //       const elementHeight = target.offsetHeight
    //       const offsetStart = line - Number(target.dataset.start)
    //       const lineHeight = elementHeight / lines
    //       additional = lineHeight * offsetStart + lineHeight * percent
    //     }
    //     refWrapper.current.scrollTo({
    //       top: target.offsetTop + additional,
    //       behavior: 'auto'
    //     })
    //   }
    // }
    // const token = PubSub.subscribe('nw-preview-pubsub', listener)
    const token = sub('nw-preview-pubsub', (_, payload) => {
      if (payload.type == 'sync-scroll') {
        if (!refContainer.current) return

        const { line, percent } = payload.data
        const doms = refContainer.current.children
        const target = binarySearchDom(doms, line)
        if (!target) return

        let additional = target.offsetHeight * percent
        // check whether is a block wrapper
        if (target.dataset.end) {
          const lines =
            Number(target.dataset.end) - Number(target.dataset.start) + 1
          const elementHeight = target.offsetHeight
          const offsetStart = line - Number(target.dataset.start)
          const lineHeight = elementHeight / lines
          additional = lineHeight * offsetStart + lineHeight * percent
        }
        refWrapper.current.scrollTo({
          top: target.offsetTop + additional,
          behavior: 'auto'
        })
      }
    })

    return () => {
      unsub(token)
      // PubSub.unsubscribe(token)
    }
  }, [])

  const styles = css({
    flexGrow: 1,
    flexBasis: 0,
    flexShrink: 0,
    overflow: 'auto',
    boxSizing: 'border-box',
    wordBreak: 'break-all',
    backgroundColor: 'white',
    borderLeft: '1px solid #ccc'
  })
  const inner = css({
    width: '80%',
    margin: 'auto',
    maxWidth: '600px'
  })
  return (
    <>
      {props.visible && (
        <div className={styles} id="preview" ref={refWrapper}>
          <div ref={refContainer} className={inner}>
            {content}
          </div>
        </div>
      )}
    </>
  )
}

export default Preview
