import { FC, useEffect, useLayoutEffect, useCallback } from 'react'
import { useEditor } from '../hooks/useEditor'
import { themePlugin } from '../libs/codemirror'
import { defaultLight } from '../libs/themes/default'
import { EditorChannel, TypeWriterIpcValue } from '../../types/common.d'

import '../css/editor.css'

// NOTE: Just a simple txt for dev.
const testInitialDoc = `# Head 1
## Head 2
### Head 3
#### Head 4
##### Head 5
###### Head 6

this is a content text, *italic*, **bold**, ***italic bold***. the \`code\`

- list 1
- list 2

1. item1
2. item2

> some quote

![img-preview](/Users/ccg/MySupport/CodePlace/creations/imarkdown/img/mac-dark.png 'preview')

\`\`\`javascript
function helloWorld() {
  return 'hello World'
}

console.log(helloWorld())
// /Users/ccg/MySupport/CodePlace/creations/imarkdown/img/mac-dark.png
\`\`\`
`

const Editor: FC = (): JSX.Element => {
  const [containerRef, editorView] = useEditor<HTMLDivElement>({
    initialDoc: testInitialDoc
  })

  useLayoutEffect(() => {
    if (!editorView) return
    // initial editor theme
    editorView.dispatch({
      effects: themePlugin.reconfigure(defaultLight)
    })
  }, [editorView])

  useEffect(() => {
    if (editorView) {
      // some thing need deal with editor instance
    }
  }, [editorView])

  const listener = useCallback(
    (_: unknown, data: EditorChannel) => {
      if (data.type === 'typewriter') {
        // toggle typewriter mode
        const value = data.value as TypeWriterIpcValue
        if (value.checked) {
          window._next_writer_rendererConfig.rendererPlugin.typewriter = true
        } else {
          window._next_writer_rendererConfig.rendererPlugin.typewriter = false
        }
      }
    },
    [editorView]
  )
  useEffect(() => {
    // for eidtor ipc
    const removeListener = window.ipc.listenEditorChannel(listener)

    return () => {
      removeListener()
    }
  }, [editorView])

  return <div id="editor-container" ref={containerRef}></div>
}

export default Editor
