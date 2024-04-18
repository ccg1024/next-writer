import { useCallback, useEffect, useState } from 'react'
import Message from './message'
import SideBar from './sidebar'
import Editor from './editor'
import Drag from './drag'
import { HomeChannel, CheckBoxValue } from '_common_type'

import '../css/home.css'
import '../css/theme.css'
import { GlobalInput } from './input'
import HeadNav from './headnav'
import { Post } from '../libs/utils'
import { WriterConfig } from 'src/types/renderer'
import { VerticalBlur } from './blur'
import FloatEmoji from './float-emoji'
import Preview from './preview'

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
    hideSidebar: (data: HomeChannel) => {
      const { checked } = data.value as CheckBoxValue
      setShowSide(!checked)
    },
    toggleHeadNav: (data: HomeChannel) => {
      const { checked } = data.value as CheckBoxValue
      setShowHeadNav(checked)
    },
    zenMode: (data: HomeChannel) => {
      const root = document.getElementById('root') as HTMLDivElement
      if (!root) {
        console.log(
          '[ERROR] can not get root element by id, when toggle zen mode'
        )
        return
      }
      const { checked } = data.value as CheckBoxValue
      root.style.padding = checked ? '0px' : '10px'
    },
    focusMode: (data: HomeChannel) => {
      const { checked } = data.value as CheckBoxValue

      setShowFocus(checked)
    },
    preview: (data: HomeChannel) => {
      const { checked } = data.value as CheckBoxValue

      setShowPreview(checked)
    },
    hideEditor: (data: HomeChannel) => {
      const { checked } = data.value as CheckBoxValue

      setHideEditor(checked)
    }
  }

  const listener = (_: unknown, data: HomeChannel) => {
    const cb = listenerMap[data.type]
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
    Post('render-to-main-to-render', {
      type: 'read-render-config'
    })
      .then(res => {
        const config = res.data as WriterConfig
        const r = document.querySelector('body')
        if (config.editorFont) {
          r.style.setProperty('--nw-editor-font-family', config.editorFont)
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
        }
        // add transition on root.
        const root = document.getElementById('root') as HTMLDivElement
        if (root) root.classList.add('root-animation')
      })
      .catch(err => {
        throw err
      })
  }, [])

  return (
    <>
      <div id="home">
        <SideBar isVisible={showSide} />
        <div
          className="home-container"
          style={{ display: hideEditor ? 'none' : 'block' }}
        >
          <Editor initialDoc={doc} onChange={onChange} />
          {showFocus && <VerticalBlur />}
        </div>
        <Preview doc={doc} visible={showPreview} hideEditor={hideEditor} />
        <HeadNav visible={showHeadNav} />
        {!showSide && <Drag />}
        <Message />
        <FloatEmoji />
      </div>
      <GlobalInput />
    </>
  )
}

export default Home
