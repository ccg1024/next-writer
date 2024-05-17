// Sidebar menu component, show this component when right click on sidebar
// file system.
import { css } from '@emotion/css'
import React, { FC, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { pub, sub, unsub } from '../libs/pubsub'
import Dividing from './dividing'

type NativeDivProps = React.HTMLAttributes<HTMLDivElement>

export type SidebarMenuConfig = {
  coordsX: number
  coordsY: number
  filepath: string
  pathPrefix: string
  pathType: 'file' | 'folder'
}
export interface SidebarMenuProps extends NativeDivProps {
  _anchor?: boolean
}
const SidebarMenu: FC<SidebarMenuProps> = (props): JSX.Element => {
  const [visible, setVisible] = useState(false)
  const [menuConfig, setMenuConfig] = useState<SidebarMenuConfig>({
    coordsX: -1,
    coordsY: -1,
    filepath: '',
    pathPrefix: '',
    pathType: 'file'
  })
  const { className, ...rest } = props
  const defaultCls = css({
    position: 'absolute',
    width: '200px',
    top: menuConfig.coordsY,
    left: menuConfig.coordsX,
    backgroundColor: 'white',
    padding: '10px',
    boxSizing: 'border-box',
    boxShadow: 'var(--nw-box-shadow-md)',
    borderRadius: 'var(--nw-border-radius-md)'
  })
  const classes = `${defaultCls} ${className ?? ''}`
  const menuItemWrap = css({
    display: 'flex',
    flexDirection: 'column'
  })

  useEffect(() => {
    const defaultConfig: SidebarMenuConfig = {
      coordsX: 0,
      coordsY: 0,
      filepath: '',
      pathType: 'file',
      pathPrefix: ''
    }
    const token = sub('nw-sidebar-menu-pubsub', (_, payload) => {
      if (!payload) return

      if (payload.type === 'show-menu') {
        const { coordsY, coordsX, pathType, filepath, pathPrefix } =
          payload.data
        // check whether got undefined data
        if (
          coordsX === undefined ||
          coordsY === undefined ||
          pathType === undefined ||
          filepath === undefined ||
          pathPrefix === undefined
        )
          return

        if (
          coordsX === null ||
          coordsY === null ||
          pathType === null ||
          filepath === null ||
          pathPrefix === null
        )
          return
        setVisible(true)
        setMenuConfig({
          coordsX,
          coordsY,
          filepath,
          pathType,
          pathPrefix
        })
      } else if (payload.type === 'close-menu') {
        setVisible(false)
        setMenuConfig(defaultConfig)
      }
    })

    return () => {
      unsub(token)
    }
  }, [])

  const fromFile = <></>
  const fromFolder = (
    <>
      <MenuItem data-id="add-file">添加文件</MenuItem>
      <MenuItem data-id="add-folder">添加文件夹</MenuItem>
    </>
  )

  // deal with menu click event
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const element = e.target as HTMLElement
    const dataset = element.dataset
    if (!dataset.id) return
    switch (dataset.id) {
      case 'add-file':
        // Send message to input component
        // the filepath is full the full path of clicked
        // file system item
        pub('nw-input-pubsub', {
          type: '',
          data: {
            pathType: 'file',
            replyChannel: 'nw-filesystem-pubsub',
            replyType: 'nw-filesystem-add',
            pathPrefix: menuConfig.filepath
          }
        })
        break
      case 'add-folder':
        // Send message to input component
        pub('nw-input-pubsub', {
          type: '',
          data: {
            pathType: 'folder',
            replyChannel: 'nw-filesystem-pubsub',
            replyType: 'nw-filesystem-add',
            pathPrefix: menuConfig.filepath
          }
        })
        break
      case 'delete':
        break
      case 'rename':
        break
      default:
        console.log(`unexcepted menu id: ${dataset.id}`)
        break
    }

    // close menu
    setVisible(false)
  }
  const dom = (
    <>
      {visible && (
        <div className={classes} {...rest} onClick={onClick}>
          <div className={menuItemWrap}>
            {menuConfig.pathType === 'file' ? fromFile : fromFolder}
          </div>
          <Dividing style={{ marginTop: '5px', marginBottom: '5px' }} />
          <div className={menuItemWrap}>
            <MenuItem data-id="rename">重命名</MenuItem>
            <MenuItem data-id="delete">删除</MenuItem>
          </div>
        </div>
      )}
    </>
  )
  return createPortal(dom, document.body)
}

interface MenuItemProps extends NativeDivProps {
  children?: React.ReactNode
}
const MenuItem: FC<MenuItemProps> = (props): JSX.Element => {
  const { children, ...rest } = props
  return (
    <div
      className={css({
        padding: '5px',
        userSelect: 'none',
        borderRadius: '5px',
        ':hover': {
          cursor: 'pointer',
          backgroundColor: 'var(--nw-color-blackAlpha-50)'
        }
      })}
      {...rest}
    >
      {children}
    </div>
  )
}

export default SidebarMenu
