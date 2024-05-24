// Initial a codemirror editor
// Find a new style to pass ref object: from youtube "devaslife"
// @author: crazycodegame
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useRef, useState, useLayoutEffect } from 'react'
import { editorDefaultExtensions } from '../libs/codemirror'
import { noSelection, Post } from '../libs/utils'
import { UpdateCacheContent } from '_types'
import { ONE_WAY_CHANNEL } from 'src/config/ipc'
import { pub } from '../libs/pubsub'

interface Props {
  initialDoc?: string
  timeKey: number // Ensure the editor re-build when toggle file which content is same.
  callback: (state: EditorState) => void
}

const ctl = {
  scrollTimer: null as NodeJS.Timeout
}

export const viewSchedulerConfig = new Compartment()
export const viewAtomicSchedulerConfig = new Compartment()
export const standaloneSchedulerConfig = new Compartment()

export const useEditor = <T extends Element>(
  props: Props
): [React.MutableRefObject<T | null>, EditorView?] => {
  const { initialDoc } = props
  const [editorView, setEditorView] = useState<EditorView>(null)
  const containerRef = useRef<T>(null)

  useLayoutEffect(() => {
    if (!containerRef.current) return

    const startState = EditorState.create({
      doc: initialDoc,
      extensions: [
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            if (
              !window._next_writer_rendererConfig.modified &&
              window._next_writer_rendererConfig.workpath !== ''
            ) {
              pub('nw-sidebar-pubsub', {
                type: 'nw-sidebar-file-change',
                data: { status: 'modified' }
              })
              Post(
                ONE_WAY_CHANNEL,
                {
                  type: 'update-cache',
                  data: {
                    filePath: window._next_writer_rendererConfig.workpath,
                    isChange: true
                  } as UpdateCacheContent
                },
                true
              ).catch(err => {
                throw err
              })
              window._next_writer_rendererConfig.modified = true
            }
            // update doc state
            props.callback(update.state)
          }
          if (
            update.selectionSet &&
            noSelection(update.state) &&
            update.docChanged
          ) {
            // typewriter mode
            if (window._next_writer_rendererConfig.plugin.typewriter) {
              const cursor = update.state.selection.main.from
              update.view.dispatch({
                effects: EditorView.scrollIntoView(cursor, {
                  y: 'center',
                  yMargin: 0
                })
              })
            }
          }
        }),
        EditorView.domEventHandlers({
          scroll(_e, view) {
            // handle scroll
            if (ctl.scrollTimer || !view) return
            ctl.scrollTimer = setTimeout(() => {
              const scrollTop =
                view.scrollDOM.scrollTop - window.innerHeight * 0.5
              const topBlockInfo = view.elementAtHeight(scrollTop)
              const line = view.state.doc.lineAt(topBlockInfo.from).number

              // publish scroll info to preview component
              let percent = 0
              if (topBlockInfo.length > 0) {
                const elementTop = topBlockInfo.top
                const elementHeight = topBlockInfo.height
                percent = (scrollTop - elementTop) / elementHeight
              }
              pub('nw-preview-pubsub', {
                type: 'sync-scroll',
                data: { line, percent: percent >= 0 ? percent : 0 }
              })
              // public scroll info to head nav component
              pub('nw-head-nav-pubsub', {
                type: 'top-head-line',
                data: { line }
              })
              ctl.scrollTimer = null
            }, 500)
          }
        }),
        ...editorDefaultExtensions,
        viewSchedulerConfig.of([]),
        viewAtomicSchedulerConfig.of([]),
        standaloneSchedulerConfig.of([])
      ]
    })

    const view = new EditorView({
      state: startState,
      parent: containerRef.current,
      scrollTo: EditorView.scrollIntoView(0, { y: 'center', yMargin: 0 })
    })
    setEditorView(view)

    return () => {
      view.destroy()
    }
  }, [props.timeKey])

  return [containerRef, editorView]
}
