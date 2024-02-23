// Initial a codemirror editor
// Find a new style to pass ref object: from youtube "devaslife"
// @author: crazycodegame
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { useRef, useEffect, useState } from 'react'
import { editorDefaultExtensions } from '../libs/codemirror'
import { hideMarkPlugin } from '../plugins/hide-marke-extension'
import { imgPreview } from '../plugins/img-preview-extension'
import { codeBlockHighlight } from '../plugins/code-block-extension'

interface Props {
  initialDoc?: string
}

export const useEditor = <T extends Element>(
  props: Props
): [React.MutableRefObject<T | null>, EditorView?] => {
  const { initialDoc } = props
  const [editorView, setEditorView] = useState<EditorView>(null)
  const containerRef = useRef<T>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const startState = EditorState.create({
      doc: initialDoc,
      extensions: [
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            // console.log('doc change')
          }
          if (update.selectionSet) {
            // typewriter mode
            // NOTE: need a config to toglle typewriter mode
            // and before start mode, need add `new Array(20).join("\n")`
            // to doc, which make sure have enough space to scroll.
            // const cursor = update.state.selection.ranges[0].from
            // update.view.dispatch({
            //   effects: EditorView.scrollIntoView(cursor, { y: 'center' })
            // })
          }
        }),
        ...editorDefaultExtensions,
        imgPreview(),
        codeBlockHighlight(),
        hideMarkPlugin
      ]
    })

    const view = new EditorView({
      state: startState,
      parent: containerRef.current
    })
    setEditorView(view)

    return () => {
      view.destroy()
    }
  }, [initialDoc])

  return [containerRef, editorView]
}
