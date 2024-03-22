import { useEffect, useState } from 'react'
import Message from './message'
import SideBar from './sidebar'
import Editor from './editor'
import Drag from './drag'
import { HomeChannel, CheckBoxValue } from '_common_type'

import '../css/home.css'
import { GlobalInput } from './input'
import HeadNav from './headnav'

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
