import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import {
  TiChevronRight,
  TiFolder,
  TiDocumentText,
  TiFolderOpen
} from 'react-icons/ti'
import { VscEllipsis } from 'react-icons/vsc'
import { css } from '@emotion/css'
import { AnimateClickDiv, InlineFlex } from './utils'
import { getFileBaseName, Post, resolve2path } from '../libs/utils'
import { useHoverShow } from '../hooks/useHoverShow'
import { FileState, RootWorkstationFolderInfo } from '_types'
import { ONE_WAY_CHANNEL, TWO_WAY_CHANNEL } from 'src/config/ipc'
import { pub, sub, unsub } from '../libs/pubsub'
import { useLibraryContext } from '../contexts/library-context'

type GetFileExplorerInfoParam = {
  parent?: string
  pathName?: string
  pathType?: 'file' | 'folder'
  openFile?: boolean
}
const Filesystem: FC = (): JSX.Element => {
  const [files, setFiles] = useState<Array<FileState>>([])
  const [folders, setFolders] = useState<Array<RootWorkstationFolderInfo>>([])
  const [showNest, setShowNest] = useState<{ [key: string]: boolean }>({})
  const callback = useCallback((prop: string) => {
    setShowNest(v => ({
      ...v,
      [prop]: !v[prop]
    }))
  }, [])

  function getFileExplorerInfo(opt?: GetFileExplorerInfoParam) {
    Post(TWO_WAY_CHANNEL, {
      type: 'read-root-workplatform-info'
    })
      .then(res => {
        if (!res || !res.data) return

        const { rootWrokplatformInfo: allInfo } = res.data

        setFiles(allInfo.files)
        setFolders(allInfo.folders)

        if (opt && opt.parent) {
          setShowNest(v => ({
            ...v,
            [opt.parent]: true
          }))
        }

        if (opt && opt.pathType === 'file' && opt.openFile) {
          if (!opt.parent || !opt.pathName) return

          Post(
            ONE_WAY_CHANNEL,
            {
              type: 'open-file',
              data: {
                filePath: `${opt.parent}/${opt.pathName}.md`
              }
            },
            true
          )
        }
      })
      .catch(err => {
        throw err
      })
  }

  useEffect(() => {
    getFileExplorerInfo()
  }, [])

  useEffect(() => {
    // const token = PubSub.subscribe('nw-filesystem-pubsub', listener)
    const token = sub('nw-filesystem-pubsub', (_, payload) => {
      if (payload.type === 'nw-filesystem-add') {
        const { parent, pathName, pathType } = payload.data
        getFileExplorerInfo({ parent, pathName, pathType, openFile: true })
      } else if (payload.type === 'nw-sync-filesystem') {
        const { files, folders } = payload.data
        pub('nw-home-pubsub', {
          type: 'toggle-global-loading',
          data: { loading: false }
        })
        setFiles(files)
        setFolders(folders)
      }
    })

    return () => {
      unsub(token)
      // PubSub.unsubscribe(token)
    }
  }, [])

  return (
    <div className="filesystem-main no-select">
      <RecursiveFileList
        visible={true}
        files={files}
        folders={folders}
        parent="."
        showNest={showNest}
        setShowNest={callback}
      />
    </div>
  )
}

interface RecursiveFileListProps {
  folders: Array<RootWorkstationFolderInfo>
  files: Array<FileState>
  visible: boolean
  parent: string
  showNest: { [key: string]: boolean }
  setShowNest: (prop: string) => void
}

const RecursiveFileList: FC<RecursiveFileListProps> = (props): JSX.Element => {
  const { visible, showNest, setShowNest } = props

  function toggleShow(prop: string) {
    setShowNest(prop)
  }

  return (
    <>
      {visible && (
        <div
          data-id="recursive-file-list"
          className={
            css`
              padding-left: ${props.parent === '.' ? 'unset' : '10px'};
            ` + ' filesystem-content'
          }
        >
          {props.folders &&
            props.folders.map(folder => {
              const uniq = props.parent + '/' + folder.name
              return (
                <div data-id="recursive-menu-wrapper" key={uniq}>
                  <FilesystemFolderItem
                    uniq={uniq}
                    showNest={showNest[uniq]}
                    name={folder.name}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      toggleShow(uniq)
                    }}
                  />
                  {folder.subfolders && (
                    <RecursiveFileList
                      folders={folder.subfolders.folders}
                      files={folder.subfolders.files}
                      visible={showNest[uniq]}
                      parent={uniq}
                      showNest={showNest}
                      setShowNest={setShowNest}
                    />
                  )}
                </div>
              )
            })}
          {props.files &&
            props.files.map(file => {
              const uniq = props.parent + '/' + file
              return (
                <FilesystemFileItem
                  key={uniq}
                  uniq={uniq}
                  filename={getFileBaseName(file.name)}
                />
              )
            })}
        </div>
      )}
    </>
  )
}

type FilesystemFileItemProps = {
  uniq: string
  filename: string
}
const FilesystemFileItem: FC<FilesystemFileItemProps> = props => {
  const { uniq, filename } = props
  const { currentFile } = useLibraryContext()

  function click(e: React.MouseEvent) {
    e.stopPropagation()
    // Make post request
    Post(
      ONE_WAY_CHANNEL,
      {
        type: 'open-file',
        data: {
          filePath: e.currentTarget.id
        }
      },
      true
    )
  }

  return (
    <div
      onClick={click}
      className={css({
        padding: '10px',
        borderRadius: '5px',
        position: 'relative',
        backgroundColor:
          currentFile ==
          resolve2path(window._next_writer_rendererConfig.root, uniq)
            ? 'var(--nw-color-blackAlpha-50)'
            : 'unset',
        ':hover': {
          backgroundColor: 'var(--nw-color-blackAlpha-50)'
        }
      })}
      id={uniq}
    >
      <InlineFlex>
        <TiDocumentText className="fixed-flex-item" />
        <span className="text-hide">{filename}</span>
      </InlineFlex>
    </div>
  )
}

type FilesystemFolderItemProps = {
  uniq: string
  showNest: boolean
  name: string
  onClick: (e: React.MouseEvent) => void
}
const FilesystemFolderItem: FC<FilesystemFolderItemProps> = props => {
  const { uniq, showNest, name } = props
  const refFolder = useRef<HTMLDivElement>(null)

  const addVisible = useHoverShow<HTMLDivElement>({
    target: refFolder
  })

  // show sidebar-menu when click the icon
  // the `type` is to control menu content, which is different
  // between file item and folder item.
  const showMenu = (uniq: string, type: 'file' | 'folder') => {
    return (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!e.currentTarget) return
      const rect = e.currentTarget.getBoundingClientRect()
      // Send message to show menu
      const pathTokens = uniq.split('/')
      pub('nw-sidebar-menu-pubsub', {
        type: 'show-menu',
        data: {
          coordsX: Math.floor(rect.x) + Math.floor(rect.width) + 10,
          coordsY: Math.floor(rect.y),
          pathType: type,
          filepath: uniq,
          pathPrefix: pathTokens.slice(0, pathTokens.length - 1).join('/')
        }
      })
    }
  }

  return (
    <div
      ref={refFolder}
      className="filesystem-item"
      id={uniq}
      onClick={props.onClick}
    >
      <InlineFlex flexGrow={1} overflow="hidden">
        {showNest ? (
          <>
            <TiChevronRight
              className="fixed-flex-item"
              style={{ transform: 'rotate(90deg)' }}
            />
            <TiFolderOpen
              className="fixed-flex-item"
              style={{ padding: '2px' }}
            />
          </>
        ) : (
          <>
            <TiChevronRight className="fixed-flex-item" />
            <TiFolder className="fixed-flex-item" style={{ padding: '2px' }} />
          </>
        )}
        <span className="text-hide">{name}</span>
      </InlineFlex>
      {addVisible && (
        <InlineFlex flexShrink={0}>
          <AnimateClickDiv
            onClick={showMenu(uniq, 'folder')}
            child={
              <VscEllipsis
                style={{ transform: 'rotate(90deg)', cursor: 'pointer' }}
              />
            }
          />
          {/* <AnimateClickDiv */}
          {/*   onClick={clickAddEffect('file', uniq)} */}
          {/*   child={<TiDocumentAdd className="icon-hover" />} */}
          {/* /> */}
          {/* <AnimateClickDiv */}
          {/*   onClick={clickAddEffect('folder', uniq)} */}
          {/*   child={<TiFolderAdd className="icon-hover" />} */}
          {/* /> */}
        </InlineFlex>
      )}
      {/* {addVisible && <AddEffect onClick={clickAddEffect} uniq={uniq} />} */}
    </div>
  )
}

export default Filesystem
