import { useEffect, useState } from 'react'
import Message from './message'
import SideBar from './sidebar'
import Editor from './editor'
import Drag from './drag'
import { HomeChannel, CheckBoxValue } from '_common_type'

import '../css/home.css'
import { GlobalInput } from './input'
import HeadNav from './headnav'
import { Post } from '../libs/utils'
import { WriterConfig } from 'src/types/renderer'

const Home = () => {
  const [showSide, setShowSide] = useState<boolean>(true)
  const [showHeadNav, setShowHeadNav] = useState<boolean>(false)

  const listener = (_: unknown, data: HomeChannel) => {
    if (data.type === 'hideSidebar') {
      const { checked } = data.value as CheckBoxValue
      setShowSide(!checked)
    } else if (data.type === 'toggleHeadNav') {
      const { checked } = data.value as CheckBoxValue
      setShowHeadNav(checked)
    }
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
      })
      .catch(err => {
        throw err
      })
  }, [])

  return (
    <>
      <div id="home">
        <SideBar isVisible={showSide} />
        <div className="home-container">
          <Editor />
        </div>
        <HeadNav visible={showHeadNav} />
        {!showSide && <Drag />}
        <Message />
      </div>
      <GlobalInput />
    </>
  )
}

export default Home
