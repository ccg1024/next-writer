import { MouseEvent, useEffect, useState } from 'react'
import Message from './message'
import Editor from './editor'

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
import DetailBar from './detail-bar'
import LibraryProvider from '../contexts/library-context'
import LibBar from './lib-bar'
import FrontMatter from './front-matter'
import Drag from './drag'

const Home = () => {
  const [showSide, setShowSide] = useState<boolean>(true)
  const [showDetail, setShowDetail] = useState<boolean>(true)
  const [showHeadNav, setShowHeadNav] = useState<boolean>(false)
  const [showFocus, setShowFocus] = useState<boolean>(true)
  const [showPreview, setShowPreview] = useState(false)
  const [hideEditor, setHideEditor] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isTypewriter, setIsTypewriter] = useState(false)

  const listenerMap = {
    toggleSidebar: (data: IpcChannelData) => {
      const { checked } = data.value
      setShowSide(checked)
    },
    toggleMidebar: (data: IpcChannelData) => {
      const { checked } = data.value
      setShowDetail(checked)
    },
    toggleHeadNav: (data: IpcChannelData) => {
      const { checked } = data.value
      setShowHeadNav(checked)
    },
    typewriter: (data: IpcChannelData) => {
      const { checked } = data.value
      setIsTypewriter(checked)
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
        window._next_writer_rendererConfig.preview = true
        pub('nw-editor-pubsub', { type: 'mount-preview' })
        return
      }

      setShowPreview(false)
      setHideEditor(false)
      window._next_writer_rendererConfig.preview = false
    },
    livePreview: (data: IpcChannelData) => {
      const { checked } = data.value

      if (checked) {
        setHideEditor(false)
        setShowPreview(true)
        window._next_writer_rendererConfig.preview = true
        pub('nw-editor-pubsub', { type: 'mount-preview' })
        return
      }
      setHideEditor(false)
      setShowPreview(false)
      window._next_writer_rendererConfig.preview = false
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
        window._next_writer_rendererConfig.plugin.hideMarks = !!config.hideMarks
        window._next_writer_rendererConfig.fontSize = fontSize
        window._next_writer_rendererConfig.fontFamily = fontFamily
        pub('nw-editor-pubsub', { type: 'mount-plugin-scheduler' })
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
        <LibraryProvider>
          {/* <SideBar isVisible={showSide} /> */}
          <LibBar visible={showSide} />
          {showDetail && <DetailBar isLibBarVisible={showSide} />}
          <div
            onClick={homeContainerClick}
            className="home-container"
            style={{ display: hideEditor ? 'none' : 'flex' }}
          >
            {!isTypewriter && (
              <>
                <Toolbar />
                <FrontMatter />
              </>
            )}
            <Editor />
            {showFocus && <VerticalBlur />}
          </div>
        </LibraryProvider>
        <Preview visible={showPreview} hideEditor={hideEditor} />
        <HeadNav visible={showHeadNav} />
        <Message />
        <FloatEmoji />
      </div>
      {!showSide && !showDetail && isTypewriter && <Drag />}
      <GlobalInput />
      <HoverImage />
      {loading && <GlobalLoading />}
    </>
  )
}

export default Home
