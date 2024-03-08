import { FC, MouseEvent } from 'react'
import styled from '@emotion/styled'

import { FileDescriptorContainer } from '../../types/common.d'

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
  padding: 5px 10px;
  border-radius: var(--nw-border-radius-md);
  background-color: ${props =>
    props.isActive ? 'var(--nw-color-whiteAlpha-50)' : 'unset'};
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
        ? 'var(--nw-color-whiteAlpha-50)'
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
    window.ipc._render_openFile(e.currentTarget.id)
  }
  return (
    <ListBox>
      {props.filelist.map(filePath => {
        const file = props.recentFiles[filePath]
        const isActive = props.currentFile === file.path
        return (
          <ListItem
            key={file.path}
            id={file.path}
            isActive={isActive}
            onClick={isActive ? null : cb}
          >
            {file.isChange && '[+] '}
            {file.name}
          </ListItem>
        )
      })}
    </ListBox>
  )
}
