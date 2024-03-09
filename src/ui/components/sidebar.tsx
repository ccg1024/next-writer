import { FC, useEffect, useRef, useState } from 'react'
import PubSub from 'pubsub-js'
import styled from '@emotion/styled'

import Resizer from './resizer'
import BroadCast from './broadcast'
import User from './user'
import Filesystem from './filesystem'
import Dividing from './dividing'
import { RecentFileList } from './filelist'
import { FileDescriptor, FileDescriptorContainer } from '../../types/common.d'
import { FileStatus } from '../../types/renderer.d'

import '../css/sidebar.css'

interface Props {
  isVisible: boolean
}

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

const VerticalScrollBox = styled.div`
  overflow: auto;
`

const SideBar: FC<Props> = (props): JSX.Element => {
  const [recentFiles, setRecentFiles] = useState<FileDescriptorContainer>({})
  const [currentFile, setCurrentFile] = useState<string>('')
  const [filelist, setFilelist] = useState<string[]>([])
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = PubSub.subscribe(
      'nw-recent-filelist',
      (_: string, fileDescriptor: FileDescriptor) => {
        if (fileDescriptor) {
          setRecentFiles(v => {
            return {
              ...v,
              [fileDescriptor.path]: fileDescriptor
            }
          })
          setCurrentFile(fileDescriptor.path)
          setFilelist(v =>
            v.includes(fileDescriptor.path) ? v : [...v, fileDescriptor.path]
          )
        }
      }
    )

    return () => {
      PubSub.unsubscribe(token)
    }
  }, [])

  useEffect(() => {
    // listen file change
    const token = PubSub.subscribe(
      'nw-listen-file-change',
      (_: string, fileStatus: FileStatus) => {
        if (!currentFile) return

        setRecentFiles(v => {
          return {
            ...v,
            [currentFile]: {
              ...v[currentFile],
              isChange: fileStatus === 'modified'
            }
          }
        })
      }
    )

    return () => {
      PubSub.unsubscribe(token)
    }
  }, [currentFile, recentFiles])

  return (
    <>
      {props.isVisible && (
        <div ref={sidebarRef} className="sidebar-main">
          <BroadCast />
          <User />
          <VerticalScrollBox>
            <Filesystem />
            <Dividing />
            <RecentFileList
              filelist={filelist}
              recentFiles={recentFiles}
              currentFile={currentFile}
            />
          </VerticalScrollBox>
          <Resizer parentRef={sidebarRef} minWidth={100} />
        </div>
      )}
    </>
  )
}

export default SideBar
