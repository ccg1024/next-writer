import styled from '@emotion/styled'
import { FC } from 'react'
import {
  MdCode,
  MdDataObject,
  MdFormatBold,
  MdFormatItalic,
  MdLibraryBooks,
  MdCoronavirus,
  MdFormatAlignLeft,
  MdFormatAlignRight,
  MdFormatAlignJustify
} from 'react-icons/md'
import { Post } from '../libs/utils'
import { ONE_WAY_CHANNEL } from 'src/config/ipc'
import { pub } from '../libs/pubsub'

const ToolDrag = styled.div`
  height: 100%;
  flex-grow: 1;
  flex-base；0;
  -webkit-app-region: drag;
`
const ToolSpan = styled.span`
  padding: 2px;
  display: flex;
  :hover {
    border-radius: var(--nw-border-radius-sm);
    background-color: var(--nw-color-blackAlpha-200);
    cursor: pointer;
  }
`
const ToolbarWrapper = styled.div`
  width: 100%;
  height: 41px;
  flex-shrink: 0;
  border-bottom: 1px solid #ccc;
  padding: 5px 0px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
`
const ToolbarBody = styled.div`
  flex-shrink: 0;
  max-width: 580px;
  width: 80%;
  margin: auto;
  display: flex;
  align-items: center;
  gap: 10px;
`

const Toolbar: FC = () => {
  const toggleSidebar = () => {
    // send message to main process
    Post(ONE_WAY_CHANNEL, { type: 'render-toggle-sidebar' }, true)
  }
  const toggleHeadNav = () => {
    // send message to main process
    Post(ONE_WAY_CHANNEL, { type: 'render-toggle-headNav' }, true)
  }
  const toolbarEvent = (eventName: string) => {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      pub('nw-editor-pubsub', { type: 'toolbar-event', data: { eventName } })
    }
  }
  return (
    <ToolbarWrapper>
      <ToolDrag />
      <ToolbarBody>
        <ToolSpan onClick={toolbarEvent('insert-bold')}>
          <MdFormatBold />
        </ToolSpan>
        <ToolSpan onClick={toolbarEvent('insert-italic')}>
          <MdFormatItalic />
        </ToolSpan>
        <ToolSpan onClick={toolbarEvent('insert-inline-code')}>
          <MdCode />
        </ToolSpan>
        <ToolSpan onClick={toolbarEvent('insert-code-block')}>
          <MdDataObject />
        </ToolSpan>
        <ToolSpan onClick={toolbarEvent('align-left')}>
          <MdFormatAlignLeft />
        </ToolSpan>
        <ToolSpan onClick={toolbarEvent('align-justify')}>
          <MdFormatAlignJustify />
        </ToolSpan>
        <ToolSpan onClick={toolbarEvent('align-right')}>
          <MdFormatAlignRight />
        </ToolSpan>
        <ToolSpan onClick={toggleSidebar} style={{ marginLeft: 'auto' }}>
          <MdLibraryBooks />
        </ToolSpan>
        <ToolSpan onClick={toggleHeadNav}>
          <MdCoronavirus />
        </ToolSpan>
      </ToolbarBody>
      <ToolDrag />
    </ToolbarWrapper>
  )
}

export default Toolbar
