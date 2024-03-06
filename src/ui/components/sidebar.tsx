import { FC, useRef } from 'react'
import Resizer from './resizer'
import BroadCast from './broadcast'
import User from './user'
import Filesystem from './filesystem'
import Dividing from './dividing'

import '../css/sidebar.css'

// interface Props {
//   isVisible: boolean
// }

// type AnimateProps = {
//   isVisible: boolean
// } & PropsWithChildren

// const Animate: FC<AnimateProps> = (props): JSX.Element => {
//   return (
//     <AnimatePresence mode="wait">
//       {props.isVisible && (
//         <motion.div
//           initial={{ x: -100, opacity: 0 }}
//           animate={{ x: 0, opacity: 1 }}
//           exit={{ x: -100, opacity: 0 }}
//           transition={{ duration: 0.5 }}
//         >
//           {props.children}
//         </motion.div>
//       )}
//     </AnimatePresence>
//   )
// }

const SideBar: FC = (): JSX.Element => {
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
