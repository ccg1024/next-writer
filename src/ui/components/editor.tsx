import {
  FC,
  MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'
import {
  useEditor,
  viewSchedulerConfig,
  viewAtomicSchedulerConfig,
  standaloneSchedulerConfig
} from '../hooks/useEditor'
import { themePlugin } from '../libs/codemirror'
import { defaultLight } from '../libs/themes/default'

import '../css/editor.css'
import { EditorView } from '@codemirror/view'
import { IpcChannelData } from '_types'
import { pub, sub, unsub } from '../libs/pubsub'
import { viewScheduler } from '../plugins/viewScheduler'
import { viewAtomicScheduler } from '../plugins/viewAtomicScheduler'
import { standaloneScheduler } from '../plugins/standaloneScheduler'
import { useLibraryContext } from '../contexts/library-context'
import { ONE_WAY_CHANNEL } from 'src/config/ipc'
import { Post } from '../libs/utils'
import { AbsoluteFullEditLogo } from './logo'
import {
  insertBlockCode,
  insertBold,
  insertCode,
  insertItalic
} from '../libs/keymap'

interface RefObj {
  isFirstRender: boolean
}
const Editor: FC = (): JSX.Element => {
  const [initialDoc, setInitialDoc] = useState('')
  const refFirst = useRef<RefObj>({
    isFirstRender: true
  })
  const [timeKey, setTimeKey] = useState<number>(-1)

  const { currentFile, setCurrentFile, saveFile, getFileState, setFileState } =
    useLibraryContext()
  const [containerRef, editorView] = useEditor<HTMLDivElement>({
    initialDoc,
    timeKey,
    getFileState,
    setFileState
  })

  // saveFile will update when state change in useLibraryContext
  // but, the invoke place is in useEffect(() => {}, [editorView])
  // so, when call saveFile in that place, just got the old state
  // but why 'currentFile' is newest, not figure out.
  // Using ref to link newest function, can solve this problem.
  const refSaveFile = useRef<(doc: string) => void>(null)
  refSaveFile.current = saveFile

  useLayoutEffect(() => {
    if (!editorView) return
    // initial editor theme
    editorView.dispatch({
      effects: [themePlugin.reconfigure(defaultLight)]
    })
    if (!refFirst.current.isFirstRender) {
      editorView.dispatch({
        effects: [
          viewSchedulerConfig.reconfigure(viewScheduler()),
          viewAtomicSchedulerConfig.reconfigure(viewAtomicScheduler()),
          standaloneSchedulerConfig.reconfigure(standaloneScheduler())
        ]
      })
    }
  }, [editorView])

  useEffect(() => {
    if (!editorView) return

    // const token = PubSub.subscribe('nw-editor-pubsub', pubsubListener)
    const token = sub('nw-editor-pubsub', (_, payload) => {
      if (!payload) return

      if (payload.type === 'head-jump') {
        const jumpPos = payload.data.jumpPos
        editorView.dispatch({
          selection: { anchor: jumpPos, head: jumpPos },
          effects: EditorView.scrollIntoView(jumpPos, {
            y: 'start',
            yMargin: 0
          })
        })
      } else if (payload.type === 'insert-emoji') {
        const cursor = editorView.state.selection.main.from
        const emoji = payload.data.emoji
        editorView.dispatch({
          changes: {
            from: cursor,
            insert: `:{${emoji}}:`
          }
        })
      } else if (payload.type === 'mount-plugin-scheduler') {
        refFirst.current.isFirstRender = false
        editorView.dispatch({
          effects: [
            viewSchedulerConfig.reconfigure(viewScheduler()),
            viewAtomicSchedulerConfig.reconfigure(viewAtomicScheduler()),
            standaloneSchedulerConfig.reconfigure(standaloneScheduler())
          ]
        })
      } else if (payload.type === 'mount-preview') {
        // publish current doc to preview component since it's visible
        pub('nw-preview-pubsub', {
          type: 'sync-doc',
          data: {
            doc: editorView.state.doc.toString(),
            timestamp: new Date().valueOf()
          }
        })
      } else if (payload.type === 'toolbar-event') {
        // some toolbar-event handler
        const { eventName } = payload.data
        switch (eventName) {
          case 'insert-bold':
            insertBold(editorView, { autoFocus: true })
            break
          case 'insert-italic':
            insertItalic(editorView, { autoFocus: true })
            break
          case 'insert-inline-code':
            insertCode(editorView, { autoFocus: true })
            break
          case 'insert-code-block':
            insertBlockCode(editorView, { autoFocus: true })
            break
          case 'align-left':
            document
              .querySelector('body')
              .style.setProperty('--nw-editor-text-align', 'left')
            break
          case 'align-justify':
            document
              .querySelector('body')
              .style.setProperty('--nw-editor-text-align', 'justify')
            break
          case 'align-right':
            document
              .querySelector('body')
              .style.setProperty('--nw-editor-text-align', 'right')
            break
        }
      }
    })
    return () => {
      unsub(token)
    }
  }, [editorView])

  const listener = (_: unknown, data: IpcChannelData) => {
    if (data.type === 'typewriter') {
      // toggle typewriter mode
      const { checked } = data.value
      if (checked) {
        window._next_writer_rendererConfig.plugin.typewriter = true
        document
          .querySelector('body')
          .style.setProperty('--nw-editor-content-padding', '50vh')
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
        document
          .querySelector('body')
          .style.setProperty('--nw-editor-content-padding', '0px')
        if (editorView.hasFocus)
          editorView.dispatch({
            effects: EditorView.scrollIntoView(
              editorView.state.selection.main.from,
              { y: 'start', yMargin: 0 }
            )
          })
      }
    } else if (data.type === 'readfile') {
      const { isLibrary, reqPath, ...value } = data.value

      // upload cache before show new file content
      if (window._next_writer_rendererConfig.workpath !== '') {
        // workpath is a absolute path
        // just cache doc content with out front-matter
        // since when change library, context will lost current library data
        Post(
          ONE_WAY_CHANNEL,
          {
            type: 'update-cache',
            data: {
              filePath: window._next_writer_rendererConfig.workpath,
              content: editorView.state.doc.toString()
            }
          },
          true
        ).catch(err => {
          throw err
        })
      }
      setInitialDoc(value.content)
      if (window._next_writer_rendererConfig.preview) {
        pub('nw-preview-pubsub', {
          type: 'sync-doc',
          data: { doc: value.content, timestamp: new Date().valueOf() }
        })
      }
      // Can not use toString(), which return seconds level of time
      // if change file to fast, the editor will not re-build, and will
      // cover next file cacha content with pre-file, if press save
      // the data on the hard drive will also be overwritten incorrectly.
      setTimeKey(new Date().valueOf()) // Make sure the editor re-build
      // update recent file list component
      // NOTE: old sidebar component needed
      // pub('nw-sidebar-pubsub', {
      //   type: 'nw-sidebar-add-recent-file',
      //   data: { ...value.fileDescriptor }
      // })

      if (isLibrary as boolean) {
        setCurrentFile(reqPath as string)
      }
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
      const { workInPath } = data.value
      if (workInPath !== currentFile) {
        console.log('前后端文件路径不一致，尝试重启应用修复')
        pub('nw-show-message', {
          type: '',
          data: { message: '前后端文件路径不一致，尝试重启应用修复' }
        })
        return
      }
      refSaveFile.current(editorView.state.doc.toString())
      // trigger modify save
      window._next_writer_rendererConfig.modified = false
      // if not a empty file save, publi a message
      if (window._next_writer_rendererConfig.workpath !== '') {
        pub('nw-show-message', {
          type: '',
          data: { message: window._next_writer_rendererConfig.workpath }
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
  }, [editorView, currentFile])

  const openFloat = (e: MouseEvent) => {
    // e.preventDefault() and return false will close right click selection
    e.preventDefault()
    const rect = containerRef.current.getBoundingClientRect()
    const diffX = e.clientX - rect.left
    const diffY = e.clientY - rect.top

    const left = diffX >= rect.width / 2 ? e.clientX - 200 : e.clientX
    const top = diffY >= rect.height / 2 ? e.clientY - 200 : e.clientY
    pub('nw-float-emoji-pubsub', { type: 'open', data: { top, left } })

    return false
  }

  return (
    <>
      <div
        onContextMenu={openFloat}
        id="editor-container"
        className="hide-scroll-bar"
        ref={containerRef}
      ></div>
      {!currentFile && <AbsoluteFullEditLogo />}
    </>
  )
}

export default Editor
