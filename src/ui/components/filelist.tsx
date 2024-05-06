import { FC, MouseEvent } from 'react'
import styled from '@emotion/styled'
import { TiMediaRecord, TiDocumentText } from 'react-icons/ti'

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
}
const ListItem = styled.div<ListItemProps>`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: var(--nw-border-radius-md);
  background-color: ${props =>
    props.isActive ? 'var(--nw-color-whiteAlpha-800)' : 'unset'};
  box-shadow: ${props =>
    props.isActive ? 'var(--nw-box-shadow-sm)' : 'unset'};
  user-select: none;
  height: 1.5em;
  line-height: 1.5em;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  &:hover {
    background-color: ${props =>
      props.isActive
        ? 'var(--nw-color-whiteAlpha-800)'
        : 'var(--nw-color-blackAlpha-100)'};
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
            >
              <ListItem
                key={file.path}
                id={file.path}
                isActive={isActive}
                onClick={isActive ? null : cb}
              >
                <TiDocumentText className="fixed-flex-item" />
                <span className="text-hide">{file.name}</span>
                {file.isChange && (
                  <TiMediaRecord
                    className="fixed-flex-item"
                    style={{ marginLeft: 'auto', color: 'red' }}
                  />
                )}
              </ListItem>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </ListBox>
  )
}
