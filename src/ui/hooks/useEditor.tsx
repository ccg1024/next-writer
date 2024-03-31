// Initial a codemirror editor
// Find a new style to pass ref object: from youtube "devaslife"
// @author: crazycodegame
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useRef, useState, useLayoutEffect } from 'react'
import PubSub from 'pubsub-js'
import { editorDefaultExtensions } from '../libs/codemirror'
import { hideMarkPlugin } from '../plugins/hide-marke-extension'
// import { imgPreview, imgPreviewField } from '../plugins/img-preview-extension'
import { codeBlockHighlight } from '../plugins/code-block-extension'
import { images } from '../plugins/images-extension'
import { headNav } from '../plugins/head-nav-extension'
import { Post } from '../libs/utils'
import { UpdateCacheContent } from '_window_type'
import { inlineEmoji } from '../plugins/emoji-extension'

interface Props {
  initialDoc?: string
  timeKey: string // Ensure the editor re-build when toggle file which content is same.
}

const ctl = {
  scrollTimer: null as NodeJS.Timeout
}

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
              window._next_writer_rendererConfig.workPath !== ''
            ) {
              PubSub.publish('nw-sidebar-pubsub', {
                type: 'nw-sidebar-file-change',
                data: 'modified'
              })
              // window.ipc._render_updateCache({
              //   filePath: window._next_writer_rendererConfig.workPath,
              //   isChange: true
              // })
              Post(
                'render-to-main',
                {
                  type: 'update-cache',
                  data: {
                    filePath: window._next_writer_rendererConfig.workPath,
                    isChange: true
                  } as UpdateCacheContent
                },
                true
              ).catch(err => {
                throw err
              })
              window._next_writer_rendererConfig.modified = true
            }
          }
          if (update.selectionSet) {
            // typewriter mode
            if (window._next_writer_rendererConfig.rendererPlugin.typewriter) {
              const cursor = update.state.selection.ranges[0].from
              update.view.dispatch({
                effects: EditorView.scrollIntoView(cursor, { y: 'center' })
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
              PubSub.publish('nw-head-nav-pubsub', {
                type: 'top-head-line',
                data: { line }
              })
              ctl.scrollTimer = null
            }, 500)
          }
        }),
        ...editorDefaultExtensions,
        // imgPreview(),
        codeBlockHighlight(),
        hideMarkPlugin,
        // imgPreviewField
        images(),
        headNav(),
        inlineEmoji()
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
  }, [initialDoc, props.timeKey])

  return [containerRef, editorView]
}
