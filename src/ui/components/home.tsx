import { useEffect, useState } from 'react'
import Message from './message'
import SideBar from './sidebar'
import Editor from './editor'
import Drag from './drag'
import { HomeChannel, CheckBoxValue } from '_common_type'

import '../css/home.css'

const Home = () => {
  const [showSide, setShowSide] = useState<boolean>(true)

  const listener = (_: unknown, data: HomeChannel) => {
    if (data.type === 'hideSidebar') {
      const { checked } = data.value as CheckBoxValue
      setShowSide(!checked)
    }
  }

  useEffect(() => {
    const cb = window.ipc.listenHomeChannel(listener)

    return () => {
      cb()
    }
  }, [])

  return (
    <div id="home">
      <SideBar isVisible={showSide} />
      <div className="home-container">
        <Editor />
      </div>
      {!showSide && <Drag />}
      <Message />
    </div>
  )
}

export default Home
