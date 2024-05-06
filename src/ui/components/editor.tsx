import {
  FC,
  MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import PubSub from 'pubsub-js'
import { useEditor, prettierListPlugin } from '../hooks/useEditor'
import { themePlugin } from '../libs/codemirror'
import { defaultLight } from '../libs/themes/default'

import '../css/editor.css'
import { EditorView } from '@codemirror/view'
import { Post } from '../libs/utils'
import { EditorState } from '@codemirror/state'
import { prettierList } from '../plugins/list-extension'
import {
  IpcChannelData,
  PubSubData,
  ReadFileDescriptor,
  UpdateCacheContent
} from '_types'
import { ONE_WAY_CHANNEL } from 'src/config/ipc'

interface EditorProps {
  initialDoc: string
  onChange: (newDoc: string) => void
}
interface RefObj {
  isFirstRender: boolean
}
const Editor: FC<EditorProps> = (props): JSX.Element => {
  const refFirst = useRef<RefObj>({
    isFirstRender: true
  })
  const [timeKey, setTimeKey] = useState<number>(-1)
  const callback = useCallback((state: EditorState) => {
    props.onChange(state.doc.toString())
  }, [])
  const [containerRef, editorView] = useEditor<HTMLDivElement>({
    initialDoc: props.initialDoc,
    timeKey,
    callback
  })

  useLayoutEffect(() => {
    if (!editorView) return
    // initial editor theme
    editorView.dispatch({
      effects: [themePlugin.reconfigure(defaultLight)]
    })
    if (!refFirst.current.isFirstRender) {
      editorView.dispatch({
        effects: prettierListPlugin.reconfigure(prettierList())
      })
    }
  }, [editorView])

  useEffect(() => {
    if (!editorView) return

    function pubsubListener(_: string, payload: PubSubData) {
      if (!payload) return

      if (payload.type === 'head-jump') {
        const jumpPos = payload.data.jumpPos as number
        editorView.dispatch({
          selection: { anchor: jumpPos, head: jumpPos },
          effects: EditorView.scrollIntoView(jumpPos, {
            y: 'start',
            yMargin: 0
          })
        })
      } else if (payload.type === 'insert-emoji') {
        const cursor = editorView.state.selection.main.from
        const emoji = payload.data.emoji as string
        editorView.dispatch({
          changes: {
            from: cursor,
            insert: `:{${emoji}}:`
          }
        })
      } else if (payload.type === 'mount-prettier-list') {
        refFirst.current.isFirstRender = false
        editorView.dispatch({
          effects: prettierListPlugin.reconfigure(prettierList())
        })
      }
    }
    const token = PubSub.subscribe('nw-editor-pubsub', pubsubListener)

    return () => {
      PubSub.unsubscribe(token)
    }
  }, [editorView])

  const listener = (_: unknown, data: IpcChannelData) => {
    if (data.type === 'typewriter') {
      // toggle typewriter mode
      const { checked } = data.value
      if (checked) {
        window._next_writer_rendererConfig.plugin.typewriter = true
        // make scroll if editor is focused.
        if (editorView.hasFocus)
          editorView.dispatch({
            effects: EditorView.scrollIntoView(
              editorView.state.selection.main.from,
              { y: 'center', yMargin: 0 }
            )
          })
      } else {
        window._next_writer_rendererConfig.plugin.typewriter = false
      }
    } else if (data.type === 'readfile') {
      const value = data.value as ReadFileDescriptor

      // upload cache before show new file content
      if (window._next_writer_rendererConfig.workpath !== '') {
        Post(
          ONE_WAY_CHANNEL,
          {
            type: 'update-cache',
            data: {
              filePath: window._next_writer_rendererConfig.workpath,
              content: editorView.state.doc.toString()
            } as UpdateCacheContent
          },
          true
        ).catch(err => {
          throw err
        })
      }

      // setDoc(value.content)
      props.onChange(value.content) // update new doc
      // Can not use toString(), which return seconds level of time
      // if change file to fast, the editor will not re-build, and will
      // cover next file cacha content with pre-file, if press save
      // the data on the hard drive will also be overwritten incorrectly.
      setTimeKey(new Date().valueOf()) // Make sure the editor re-build
      // update recent file list component
      PubSub.publish('nw-sidebar-pubsub', {
        type: 'nw-sidebar-add-recent-file',
        data: value.fileDescriptor
      })
      // update editor working path
      window._next_writer_rendererConfig.workpath = value.fileDescriptor.path
      window._next_writer_rendererConfig.modified =
        value.fileDescriptor.isChange
    } else if (data.type === 'insertImage') {
      const imgPath = data.value.imgPath as string

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
        ONE_WAY_CHANNEL,
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
        data: { status: 'normal' }
      })
      // if not a empty file save, publi a message
      if (window._next_writer_rendererConfig.workpath !== '') {
        PubSub.publish('nw-show-message', {
          data: {
            message: window._next_writer_rendererConfig.workpath
          }
        })
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
