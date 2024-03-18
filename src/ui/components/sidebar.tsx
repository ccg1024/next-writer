import { FC, useEffect, useRef, useState } from 'react'
import PubSub from 'pubsub-js'
import styled from '@emotion/styled'

import Resizer from './resizer'
import BroadCast from './broadcast'
import User from './user'
import Filesystem from './filesystem'
import Dividing from './dividing'
import { RecentFileList } from './filelist'
import { FileDescriptor, FileDescriptorContainer } from '_common_type'
import { PubSubData } from 'src/types/renderer'

import '../css/sidebar.css'
import { GlobalMask } from './utils'

interface Props {
  isVisible: boolean
}

const VerticalScrollBox = styled.div`
  overflow: auto;
`

const SideBar: FC<Props> = (props): JSX.Element => {
  const [recentFiles, setRecentFiles] = useState<FileDescriptorContainer>({})
  const [currentFile, setCurrentFile] = useState<string>('')
  const [filelist, setFilelist] = useState<string[]>([])
  const sidebarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // ipc, when save a empty path file, this listener will be triggered
    const removeListener = window.ipc.listenSidebarChannel(
      (_: unknown, fileDescriptor: FileDescriptor) => {
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
          window._next_writer_rendererConfig.workPath = fileDescriptor.path
          PubSub.publish('nw-show-message', fileDescriptor.path)
        }
      }
    )

    return () => {
      removeListener()
    }
  }, [])

  // regist pubsub event
  useEffect(() => {
    const tokenFuc = (_: string, data: PubSubData) => {
      if (data.type === 'nw-sidebar-file-change') {
        if (!currentFile) return

        setRecentFiles(v => ({
          ...v,
          [currentFile]: {
            ...v[currentFile],
            isChange: data.data === 'modified'
          }
        }))
      } else if (data.type === 'nw-sidebar-add-recent-file') {
        const fileDescriptor = data.data as FileDescriptor
        setRecentFiles(v => ({
          ...v,
          [fileDescriptor.path]: fileDescriptor
        }))
        setCurrentFile(fileDescriptor.path)
        setFilelist(v =>
          v.includes(fileDescriptor.path) ? v : [...v, fileDescriptor.path]
        )
      }
    }
    // regist pubsub listener
    const token = PubSub.subscribe('nw-sidebar-pubsub', tokenFuc)

    return () => {
      PubSub.unsubscribe(token)
    }
  }, [currentFile])

  return (
    <>
      {props.isVisible && (
        <div ref={sidebarRef} className="sidebar-main">
          <BroadCast currentFile={currentFile} />
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
          <GlobalMask isMediaControl={true} />
        </div>
      )}
    </>
  )
}

export default SideBar
