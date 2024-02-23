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
