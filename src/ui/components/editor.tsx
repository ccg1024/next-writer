import { FC, useEffect, useLayoutEffect, useState } from 'react'
import PubSub from 'pubsub-js'
import { useEditor } from '../hooks/useEditor'
import { themePlugin } from '../libs/codemirror'
import { defaultLight } from '../libs/themes/default'
import {
  EditorChannel,
  TypeWriterIpcValue,
  ReadFileIpcValue
} from '../../types/common.d'

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
  const [doc, setDoc] = useState<string>(testInitialDoc)
  const [containerRef, editorView] = useEditor<HTMLDivElement>({
    initialDoc: doc
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
      // NOTE:
      // Make sure that the top is displayed when you open the file multiple times.
      // Because the scroll body is lifted onto the parent box.
      // editorView.dispatch({
      //   effects: EditorView.scrollIntoView(0, { y: 'nearest' })
      // })
      containerRef.current.scrollTo({
        top: 0
      })
    }
  }, [editorView])

  const listener = (_: unknown, data: EditorChannel) => {
    if (data.type === 'typewriter') {
      // toggle typewriter mode
      const value = data.value as TypeWriterIpcValue
      if (value.checked) {
        window._next_writer_rendererConfig.rendererPlugin.typewriter = true
      } else {
        window._next_writer_rendererConfig.rendererPlugin.typewriter = false
      }
    } else if (data.type === 'readfile') {
      const value = data.value as ReadFileIpcValue

      // upload cache before show new file content
      if (window._next_writer_rendererConfig.workPath !== '') {
        window.ipc._render_updateCache({
          filePath: window._next_writer_rendererConfig.workPath,
          content: editorView.state.doc.toString()
        })
      }

      setDoc(value.content)
      // update recent file list component
      PubSub.publish('nw-recent-filelist', value.fileDescriptor)
      // update editor working path
      window._next_writer_rendererConfig.workPath = value.fileDescriptor.path
      window._next_writer_rendererConfig.modified =
        value.fileDescriptor.isChange
    } else if (data.type === 'insertImage') {
      const imgPath = data.value as string

      if (!imgPath) return

      const cursor = editorView.state.selection.main.from
      editorView.dispatch({
        changes: {
          from: cursor,
          insert: `![](${imgPath})`
        },
        selection: {
          anchor: cursor + 2
        }
      })
    } else if (data.type === 'writefile') {
      window.ipc._render_saveFile(editorView.state.doc.toString())
      // trigger modify save
      window._next_writer_rendererConfig.modified = false
      PubSub.publish('nw-listen-file-change', 'normal')
      // if not a empty file save, publi a message
      if (window._next_writer_rendererConfig.workPath !== '') {
        PubSub.publish(
          'nw-show-message',
          window._next_writer_rendererConfig.workPath
        )
      }
    }
  }

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
