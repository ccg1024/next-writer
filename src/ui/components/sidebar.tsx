import { FC, useEffect, useRef, useState } from 'react'
import PubSub from 'pubsub-js'
import styled from '@emotion/styled'

import Resizer from './resizer'
import BroadCast from './broadcast'
import User from './user'
import Filesystem from './filesystem'
import Dividing from './dividing'
import { RecentFileList } from './filelist'

import '../css/sidebar.css'
import { GlobalMask } from './utils'
import { AnimatePresence, motion } from 'framer-motion'
import { css } from '@emotion/css'
import { FileDescriptor, FileDescriptorContainer, PubSubData } from '_types'

interface Props {
  isVisible: boolean
}

const VerticalScrollBox = styled.div`
  overflow: auto;
  padding-left: 10px;
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
          window._next_writer_rendererConfig.workpath = fileDescriptor.path
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
    const tokenFuc = (_: string, payload: PubSubData) => {
      if (payload.type === 'nw-sidebar-file-change') {
        if (!currentFile) return

        setRecentFiles(v => ({
          ...v,
          [currentFile]: {
            ...v[currentFile],
            isChange: payload.data.status === 'modified'
          }
        }))
      } else if (payload.type === 'nw-sidebar-add-recent-file') {
        const fileDescriptor = payload.data as FileDescriptor
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
      <AnimatePresence initial={false}>
        {props.isVisible && (
          <motion.div
            ref={sidebarRef}
            className="sidebar-main"
            initial={{ width: 0 }}
            animate={{ width: '220px' }}
            exit={{ width: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div
              id="side-bar-dragable"
              className={css(`
                height: 30px;
                flex-shrink: 0;
                flex-grow: 0;
                -webkit-app-region: drag
              `)}
            ></div>
            <BroadCast currentFile={currentFile} />
            <User />
            <VerticalScrollBox>
              <Filesystem currentFile={currentFile} />
              <Dividing />
              <RecentFileList
                filelist={filelist}
                recentFiles={recentFiles}
                currentFile={currentFile}
              />
            </VerticalScrollBox>
            <Resizer parentRef={sidebarRef} minWidth={220} />
            <GlobalMask isMediaControl={true} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default SideBar
