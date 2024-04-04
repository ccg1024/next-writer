import { FC, MouseEvent, useEffect, useLayoutEffect, useState } from 'react'
import PubSub from 'pubsub-js'
import { useEditor } from '../hooks/useEditor'
import { themePlugin } from '../libs/codemirror'
import { defaultLight } from '../libs/themes/default'
import {
  EditorChannel,
  TypeWriterIpcValue,
  ReadFileIpcValue
} from '_common_type'

import '../css/editor.css'
import { PubSubData } from 'src/types/renderer'
import { EditorView } from '@codemirror/view'
import { Post } from '../libs/utils'
import { UpdateCacheContent } from '_window_type'

// NOTE: Just a simple txt for dev.
const _testInitialDoc = `# Head 1
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
  const [doc, setDoc] = useState<string>('')
  const [timeKey, setTimeKey] = useState<string>('')
  const [containerRef, editorView] = useEditor<HTMLDivElement>({
    initialDoc: doc,
    timeKey
  })

  useLayoutEffect(() => {
    if (!editorView) return
    // initial editor theme
    editorView.dispatch({
      effects: themePlugin.reconfigure(defaultLight)
    })
  }, [editorView])

  useEffect(() => {
    if (!editorView) return

    function pubsubListener(_: string, data: PubSubData) {
      if (!data) return

      if (data.type === 'head-jump') {
        const jumpPos = data.data as number
        editorView.dispatch({
          selection: { anchor: jumpPos, head: jumpPos },
          effects: EditorView.scrollIntoView(jumpPos, {
            y: 'start',
            yMargin: 0
          })
        })
      } else if (data.type === 'insert-emoji') {
        const cursor = editorView.state.selection.main.from
        const emoji = data.data as string
        editorView.dispatch({
          changes: {
            from: cursor,
            insert: `:{${emoji}}:`
          }
        })
      }
    }
    const token = PubSub.subscribe('nw-editor-pubsub', pubsubListener)

    return () => {
      PubSub.unsubscribe(token)
    }
  }, [editorView])

  const listener = (_: unknown, data: EditorChannel) => {
    if (data.type === 'typewriter') {
      // toggle typewriter mode
      const value = data.value as TypeWriterIpcValue
      if (!value.checked) {
        window._next_writer_rendererConfig.rendererPlugin.typewriter = true
        // make scroll if editor is focused.
        if (editorView.hasFocus)
          editorView.dispatch({
            effects: EditorView.scrollIntoView(
              editorView.state.selection.main.from,
              { y: 'center', yMargin: 0 }
            )
          })
      } else {
        window._next_writer_rendererConfig.rendererPlugin.typewriter = false
      }
    } else if (data.type === 'readfile') {
      const value = data.value as ReadFileIpcValue

      // upload cache before show new file content
      if (window._next_writer_rendererConfig.workPath !== '') {
        Post(
          'render-to-main',
          {
            type: 'update-cache',
            data: {
              filePath: window._next_writer_rendererConfig.workPath,
              content: editorView.state.doc.toString()
            } as UpdateCacheContent
          },
          true
        ).catch(err => {
          throw err
        })
      }

      setDoc(value.content)
      setTimeKey(new Date().toString()) // Make sure the editor re-build
      // update recent file list component
      PubSub.publish('nw-sidebar-pubsub', {
        type: 'nw-sidebar-add-recent-file',
        data: value.fileDescriptor
      })
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
      // window.ipc._render_saveFile(editorView.state.doc.toString())
      Post(
        'render-to-main',
        {
          type: 'save-file',
          data: { content: editorView.state.doc.toString() }
        },
        true
      ).catch(err => {
        throw err
      })
      // trigger modify save
      window._next_writer_rendererConfig.modified = false
      PubSub.publish('nw-sidebar-pubsub', {
        type: 'nw-sidebar-file-change',
        data: 'normal'
      })
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

  const openFloat = (e: MouseEvent) => {
    // e.preventDefault() and return false will close right click selection
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const diffX = e.clientX - rect.left
    const diffY = e.clientY - rect.top

    const left = diffX >= rect.width / 2 ? e.clientX - 200 : e.clientX
    const top = diffY >= rect.height / 2 ? e.clientY - 200 : e.clientY
    PubSub.publish('nw-float-emoji-pubsub', {
      type: 'open',
      data: { top, left }
    })

    return false
  }

  return (
    <div
      onContextMenu={openFloat}
      id="editor-container"
      className="hide-scroll-bar"
      ref={containerRef}
    ></div>
  )
}

export default Editor
