import PubSub from 'pubsub-js'
import { MouseEvent, useCallback, useEffect, useState } from 'react'
import Message from './message'
import SideBar from './sidebar'
import Editor from './editor'
import Drag from './drag'

import '../css/home.css'
import '../css/theme.css'
import { GlobalInput } from './input'
import HeadNav from './headnav'
import { Post } from '../libs/utils'
import { HomeChannelType, IpcChannelData, PubSubData } from '_types'
import { VerticalBlur } from './blur'
import FloatEmoji from './float-emoji'
import Preview from './preview'
import Toolbar from './toolbar'
import { TWO_WAY_CHANNEL } from 'src/config/ipc'
import { HoverImage } from './image'

const Home = () => {
  const [showSide, setShowSide] = useState<boolean>(true)
  const [showHeadNav, setShowHeadNav] = useState<boolean>(false)
  const [showFocus, setShowFocus] = useState<boolean>(true)
  const [showPreview, setShowPreview] = useState(false)
  const [hideEditor, setHideEditor] = useState(false)
  const [doc, setDoc] = useState<string>('')

  const onChange = useCallback((newDoc: string) => {
    setDoc(newDoc)
  }, [])

  const listenerMap = {
    toggleSidebar: (data: IpcChannelData) => {
      const { checked } = data.value
      setShowSide(checked)
    },
    toggleHeadNav: (data: IpcChannelData) => {
      const { checked } = data.value
      setShowHeadNav(checked)
    },
    focusMode: (data: IpcChannelData) => {
      const { checked } = data.value

      setShowFocus(checked)
    },
    preview: (data: IpcChannelData) => {
      const { checked } = data.value

      setShowPreview(checked)
    },
    hideEditor: (data: IpcChannelData) => {
      const { checked } = data.value

      setHideEditor(checked)
    }
  }

  const listener = (_: unknown, data: IpcChannelData) => {
    const type = data.type as HomeChannelType
    const cb = listenerMap[type]
    if (cb) cb(data)
  }

  useEffect(() => {
    const cb = window.ipc.listenHomeChannel(listener)

    return () => {
      cb()
    }
  }, [])

  useEffect(() => {
    // get render config
    Post(TWO_WAY_CHANNEL, {
      type: 'read-render-config'
    })
      .then(res => {
        if (!res) return

        const { renderConfig: config } = res.data
        const r = document.querySelector('body')

        let fontSize = '16px'
        let fontFamily = 'M PLUS Rounded 1c'
        if (config.editorFont) {
          r.style.setProperty('--nw-editor-font-family', config.editorFont)
          fontFamily = config.editorFont
        }
        if (config.codeFont) {
          r.style.setProperty('--nw-editor-code-font-family', config.codeFont)
        }
        if (config.uiFont) {
          r.style.setProperty('--nw-ui-font-family', config.uiFont)
        }
        if (config.uiFontSize) {
          r.style.setProperty('--nw-ui-font-size', config.uiFontSize)
        }
        if (config.editorFontSize) {
          r.style.setProperty('--nw-editor-font-size', config.editorFontSize)
          fontSize = config.editorFontSize
        }
        if (config.focusMode !== null || config.focusMode !== undefined) {
          setShowFocus(config.focusMode)
        }
        window._next_writer_rendererConfig.plugin.typewriter =
          !!config.typewriter
        window._next_writer_rendererConfig.fontSize = fontSize
        window._next_writer_rendererConfig.fontFamily = fontFamily
        PubSub.publish('nw-editor-pubsub', {
          type: 'mount-prettier-list'
        } as PubSubData)
      })
      .catch(err => {
        throw err
      })

    Post(TWO_WAY_CHANNEL, {
      type: 'process-config'
    })
      .then(res => {
        if (!res) return
        const { root } = res.data
        window._next_writer_rendererConfig.root = root
      })
      .catch(err => {
        throw err
      })
  }, [])

  const homeContainerClick = (e: MouseEvent) => {
    if (!e.target) return
    const element = e.target as HTMLElement

    if (element.tagName == 'IMG') {
      const src = (element as HTMLImageElement).src
      const payload: PubSubData = {
        type: 'show-hover-image',
        data: { src }
      }
      PubSub.publish('nw-hover-image-pubsub', payload)
    }
  }

  return (
    <>
      <div id="home">
        <SideBar isVisible={showSide} />
        <div
          onClick={homeContainerClick}
          className="home-container"
          style={{ display: hideEditor ? 'none' : 'block' }}
        >
          <Editor initialDoc={doc} onChange={onChange} />
          {showFocus && <VerticalBlur />}
          <Toolbar />
        </div>
        <Preview doc={doc} visible={showPreview} hideEditor={hideEditor} />
        <HeadNav visible={showHeadNav} />
        {!showSide && <Drag />}
        <Message />
        <FloatEmoji />
      </div>
      <GlobalInput />
      <HoverImage />
    </>
  )
}

export default Home
