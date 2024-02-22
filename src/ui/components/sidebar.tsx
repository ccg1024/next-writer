import { useRef } from 'react'
import Resizer from './resizer'
import BroadCast from './broadcast'
import User from './user'
import Filesystem from './filesystem'
import Dividing from './dividing'

import '../css/sidebar.css'

const SideBar = (): JSX.Element => {
  const sidebarRef = useRef<HTMLDivElement>(null)
  return (
    <div ref={sidebarRef} className="sidebar-main">
      <BroadCast />
      <User />
      <Filesystem />
      <Dividing />
      <Resizer parentRef={sidebarRef} minWidth={100} />
    </div>
  )
}

export default SideBar
