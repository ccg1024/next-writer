import SideBar from './sidebar'
import Editor from './editor'
import Drag from './drag'

import '../css/home.css'
import { useEffect, useState } from 'react'
import { HomeChannel, CheckBoxValue } from '../../types/common.d'
import Message from './message'

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
