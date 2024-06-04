import { css } from '@emotion/css'
import { FC, PropsWithChildren, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TWO_WAY_CHANNEL } from 'src/config/ipc'
import { useLibraryContext } from '../contexts/library-context'
import { Post } from '../libs/utils'

const LibFloatMenuWrapper: FC<PropsWithChildren> = ({
  children
}): JSX.Element => {
  const refWrap = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!refWrap.current) return
    refWrap.current.focus()
  }, [])
  const wrap = (
    <div
      ref={refWrap}
      tabIndex={0}
      className={css({
        backgroundColor: 'var(--nw-color-whiteAlpha-800)',
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        zIndex: 100
      })}
    >
      {children}
    </div>
  )

  return createPortal(wrap, document.body)
}

const LibFloatMenuBody: FC<PropsWithChildren> = ({ children }): JSX.Element => {
  return (
    <div
      className={css({
        position: 'absolute',
        top: 0,
        right: 0,
        width: '220px',
        height: '100%',
        backgroundColor: 'white',
        boxShadow: 'var(--nw-box-shadow-md)',
        padding: '20px'
      })}
    >
      {children}
    </div>
  )
}

interface LibFloatMenuItemProps {
  onClick?: (e: React.MouseEvent) => void
  children?: React.ReactNode
  enable?: boolean
}
const LibFloatMenuItem: FC<LibFloatMenuItemProps> = (props): JSX.Element => {
  const isEnable = props.enable ?? true
  const click = isEnable && props.onClick ? props.onClick : null
  return (
    <div
      onClick={click}
      className={css({
        color: !isEnable ? 'gray' : 'unset',
        padding: '10px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        ':hover': {
          backgroundColor: isEnable ? 'var(--nw-color-blackAlpha-50)' : 'unset',
          cursor: isEnable ? 'default' : 'not-allowed'
        }
      })}
    >
      {props.children}
    </div>
  )
}

const LibFloatMenu: FC = (): JSX.Element => {
  const {
    currentLibrary,
    currentFile,
    setCurrentFile,
    setCurrentLibrary,
    getLibrary
  } = useLibraryContext()
  const getFileLib = (file: string) => {
    if (!file) return null

    const fileTokens = file.split('/')
    fileTokens.pop()
    return fileTokens.join('/')
  }
  const isFileInLib = (lib: string, file: string) => {
    const libTokens = lib.split('/')
    const fileTokens = file.split('/')
    if (fileTokens.length - libTokens.length !== 1) return false
    for (let i = 0; i < libTokens.length; i++) {
      if (libTokens[i] !== fileTokens[i]) return false
    }
    return true
  }
  const click = (type: 'file' | 'folder') => {
    return () => {
      Post(TWO_WAY_CHANNEL, {
        type: 'delete-libOrfile',
        data: { type, pathInLib: type == 'file' ? currentFile : currentLibrary }
      }).then(res => {
        if (res.data.status === 'success') {
          getLibrary()
          if (type === 'file') {
            setCurrentFile(null)
            return
          }
          if (!currentFile) {
            setCurrentLibrary(null)
            return
          }
          if (isFileInLib(currentLibrary, currentFile)) {
            setCurrentLibrary(null)
            setCurrentFile(null)
            return
          }
          setCurrentLibrary(getFileLib(currentFile))
        } else if (res.data.status === 'error') {
          // TODO: some error handle
        } else if (res.data.status === 'cancel') {
          // TODO: some cancel handle
        }
      })
    }
  }
  return (
    <LibFloatMenuWrapper>
      <LibFloatMenuBody>
        <LibFloatMenuItem enable={!!currentLibrary} onClick={click('folder')}>
          删除当前库
        </LibFloatMenuItem>
        <LibFloatMenuItem enable={!!currentFile} onClick={click('file')}>
          删除当前笔记
        </LibFloatMenuItem>
      </LibFloatMenuBody>
    </LibFloatMenuWrapper>
  )
}

export default LibFloatMenu
