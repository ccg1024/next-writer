import { FC, MouseEvent } from 'react'
import styled from '@emotion/styled'
import { TiDocumentText } from 'react-icons/ti'

import { AnimatePresence, motion } from 'framer-motion'
import { Post } from '../libs/utils'
import { FileDescriptorContainer } from '_types'
import { ONE_WAY_CHANNEL } from 'src/config/ipc'

const ListBox = styled.div`
  margin: 10px 0;
  padding-right: 10px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 5px;
`

type ListItemProps = {
  isActive: boolean
  isChange?: boolean
}
const ListItem = styled.div<ListItemProps>`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px;
  line-height: 1;
  border-radius: 5px;
  background-color: ${props =>
    props.isActive
      ? props.isChange
        ? 'var(--nw-color-redAlpha-400)'
        : 'var(--nw-color-blackAlpha-100)'
      : props.isChange
        ? 'var(--nw-color-redAlpha-200)'
        : 'unset'};
  box-shadow: ${props =>
    props.isActive
      ? props.isChange
        ? '0px 0px 5px var(--nw-color-redAlpha-400)'
        : '0px 0px 5px #808080'
      : 'unset'};
  user-select: none;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  &:hover {
    background-color: ${props =>
      props.isActive
        ? props.isChange
          ? 'var(--nw-color-redAlpha-400)'
          : 'var(--nw-color-blackAlpha-100)'
        : props.isChange
          ? 'var(--nw-color-redAlpha-400)'
          : 'var(--nw-color-blackAlpha-50)'};
  }
`

interface Props {
  recentFiles: FileDescriptorContainer
  filelist: string[]
  currentFile: string
}

export const RecentFileList: FC<Props> = props => {
  function cb(e: MouseEvent) {
    // window.ipc._render_openFile(e.currentTarget.id)
    Post(
      ONE_WAY_CHANNEL,
      {
        type: 'open-recent-file',
        data: {
          filePath: e.currentTarget.id
        }
      },
      true
    ).catch(err => {
      throw err
    })
  }
  return (
    <ListBox>
      <AnimatePresence initial={false}>
        {props.filelist.map(filePath => {
          const file = props.recentFiles[filePath]
          const isActive = props.currentFile === file.path
          return (
            <motion.div
              key={file.path}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -10, opacity: 0 }}
              transition={{ duration: 0.5 }}
              whileTap={{ scale: 0.8 }}
            >
              <ListItem
                key={file.path}
                id={file.path}
                isActive={isActive}
                onClick={isActive ? null : cb}
                isChange={file.isChange}
              >
                <TiDocumentText className="fixed-flex-item" />
                <span className="text-hide">{file.name}</span>
              </ListItem>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </ListBox>
  )
}
