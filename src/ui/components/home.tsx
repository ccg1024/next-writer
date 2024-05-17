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
import { HomeChannelType, IpcChannelData } from '_types'
import { VerticalBlur } from './blur'
import FloatEmoji from './float-emoji'
import Preview from './preview'
import Toolbar from './toolbar'
import { TWO_WAY_CHANNEL } from 'src/config/ipc'
import { HoverImage } from './image'
import { pub, sub, unsub } from '../libs/pubsub'
import { GlobalLoading } from './utils'

const Home = () => {
  const [showSide, setShowSide] = useState<boolean>(true)
  const [showHeadNav, setShowHeadNav] = useState<boolean>(false)
  const [showFocus, setShowFocus] = useState<boolean>(true)
  const [showPreview, setShowPreview] = useState(false)
  const [hideEditor, setHideEditor] = useState(false)
  const [doc, setDoc] = useState<string>('')
  const [loading, setLoading] = useState(false)

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

      if (checked) {
        // just show preview
        setShowPreview(true)
        setHideEditor(true)
        return
      }

      setShowPreview(false)
      setHideEditor(false)
    },
    livePreview: (data: IpcChannelData) => {
      const { checked } = data.value

      if (checked) {
        setHideEditor(false)
        setShowPreview(true)
        return
      }
      setHideEditor(false)
      setShowPreview(false)
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
        pub('nw-editor-pubsub', { type: 'mount-prettier-list' })
        // PubSub.publish('nw-editor-pubsub', {
        //   type: 'mount-prettier-list'
        // } as PubSubData)
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

  useEffect(() => {
    const token = sub('nw-home-pubsub', (_, payload) => {
      if (!payload) return

      if (payload.type === 'toggle-global-loading') {
        const { loading } = payload.data
        setLoading(!!loading)
      }
    })

    return () => {
      unsub(token)
    }
  }, [])

  const homeContainerClick = (e: MouseEvent) => {
    if (!e.target) return
    const element = e.target as HTMLElement

    if (element.tagName == 'IMG') {
      const src = (element as HTMLImageElement).src
      // const payload: PubSubData = {
      //   type: 'show-hover-image',
      //   data: { src }
      // }
      // PubSub.publish('nw-hover-image-pubsub', payload)
      pub('nw-hover-image-pubsub', { type: 'show-hover-image', data: { src } })
    }
  }

  // global click event
  const onClick = () => {
    // close sidebar-menu
    pub('nw-sidebar-menu-pubsub', {
      type: 'close-menu'
    })
  }

  return (
    <>
      <div id="home" onClick={onClick}>
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
      {loading && <GlobalLoading />}
    </>
  )
}

export default Home
