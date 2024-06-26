import { FC, useEffect, useRef, useState } from 'react'
import styled from '@emotion/styled'

import BroadCast from './broadcast'
import User from './user'
import Filesystem from './filesystem'
import Dividing from './dividing'
import { RecentFileList } from './filelist'

import '../css/sidebar.css'
import { AnimatePresence, motion } from 'framer-motion'
import { css } from '@emotion/css'
import { FileDescriptor, FileDescriptorContainer, IpcChannelData } from '_types'
import { pub, sub, unsub } from '../libs/pubsub'
import SidebarMenu from './sidebar-menu'
import { useLibraryContext } from '../contexts/library-context'

interface Props {
  isVisible: boolean
}

const VerticalScrollBox = styled.div`
  overflow: auto;
  padding-left: 10px;
`

const SideBar: FC<Props> = (props): JSX.Element => {
  const [recentFiles, setRecentFiles] = useState<FileDescriptorContainer>({})
  const [filelist, setFilelist] = useState<string[]>([])
  const sidebarRef = useRef<HTMLDivElement>(null)

  const { currentFile, setCurrentFile } = useLibraryContext()

  useEffect(() => {
    // ipc, when save a empty path file, this listener will be triggered
    const removeListener = window.ipc.listenSidebarChannel(
      (_: unknown, payload: IpcChannelData) => {
        if (payload.type === 'sidebar-save-empty') {
          const value = payload.value as FileDescriptor
          const fileDescriptor: FileDescriptor = {
            isChange: value.isChange,
            path: value.path,
            name: value.name
          }
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
          // PubSub.publish('nw-show-message', fileDescriptor.path)
          pub('nw-show-message', {
            type: '',
            data: { message: fileDescriptor.path }
          })
        } else if (payload.type === 'sidebar-sync-file-tree') {
          // NOTE: sync sidebar file tree
          const { manualStatus } = payload.value
          if (manualStatus === 'pending') {
            // show loading
            pub('nw-home-pubsub', {
              type: 'toggle-global-loading',
              data: { loading: true }
            })
            return
          }
          if (manualStatus === 'rejected') {
            // if get some error, close global loading first
            pub('nw-home-pubsub', {
              type: 'toggle-global-loading',
              data: { loading: false }
            })
            // NOTE: There permission denied on production enviroment
            // this blog make some solution
            // https://juejin.cn/s/electron%20mac%20%E6%9D%83%E9%99%90
          }
          if (manualStatus === 'fulfilled') {
            const { files, folders } = payload.value
            pub('nw-filesystem-pubsub', {
              type: 'nw-sync-filesystem',
              data: { files, folders }
            })
          }
        }
      }
    )

    return () => {
      removeListener()
    }
  }, [])

  // regist pubsub event
  useEffect(() => {
    // regist pubsub listener
    // const token = PubSub.subscribe('nw-sidebar-pubsub', tokenFuc)
    const token = sub('nw-sidebar-pubsub', (_, payload) => {
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
        const fileDescriptor: FileDescriptor = {
          isChange: payload.data.isChange,
          path: payload.data.path,
          name: payload.data.name
        }
        setRecentFiles(v => ({
          ...v,
          [fileDescriptor.path]: fileDescriptor
        }))
        setCurrentFile(fileDescriptor.path)
        setFilelist(v =>
          v.includes(fileDescriptor.path) ? v : [...v, fileDescriptor.path]
        )
      }
    })

    return () => {
      // PubSub.unsubscribe(token)
      unsub(token)
    }
  }, [currentFile])

  return (
    <>
      <AnimatePresence initial={false}>
        {props.isVisible && (
          <motion.div
            ref={sidebarRef}
            className="sidebar-main"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: '220px', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
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
            <BroadCast />
            <User />
            <VerticalScrollBox>
              <Filesystem />
              <Dividing />
              <RecentFileList filelist={filelist} recentFiles={recentFiles} />
            </VerticalScrollBox>
            <SidebarMenu />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default SideBar
