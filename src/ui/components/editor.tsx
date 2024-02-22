import { FC, useEffect, useLayoutEffect } from 'react'
import { useEditor } from '../hooks/useEditor'
import { themePlugin } from '../libs/codemirror'
import { defaultLight } from '../libs/themes/default'

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

  return <div id="editor-container" ref={containerRef}></div>
}

export default Editor
