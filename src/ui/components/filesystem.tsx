import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import { TiFolder, TiDocument, TiFolderOpen } from 'react-icons/ti'
import { css } from '@emotion/css'
import { AddEffect, InlineFlex } from './utils'
import { getFileBaseName, Post, resolve2path } from '../libs/utils'
import { useHoverShow } from '../hooks/useHoverShow'
import { RootWorkstationFolderInfo } from '_types'
import { ONE_WAY_CHANNEL, TWO_WAY_CHANNEL } from 'src/config/ipc'
import { pub, sub, unsub } from '../libs/pubsub'

type GetFileExplorerInfoParam = {
  parent?: string
  pathName?: string
  pathType?: 'file' | 'folder'
  openFile?: boolean
}
interface FilesystemProps {
  currentFile: string
}
const Filesystem: FC<FilesystemProps> = (props): JSX.Element => {
  const [files, setFiles] = useState<Array<string>>([])
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
    // function listener(_: string, payload: PubSubData) {
    //   if (payload.type === 'nw-filesystem-add') {
    //     // since success add file or folder
    //     // update state from main process
    //     // NOTE: since update foders data need recursive, it's not
    //     // easy on setState fucntion
    //     // const fileDesc = data.data as RenderNewFileReply
    //     // if (fileDesc.pathType === 'file') {
    //     //   setFiles(v => [...v, fileDesc.pathName])
    //     // } else if (fileDesc.pathType === 'folder') {
    //     //   // setFolders(v => [...v, fileDesc.pathName])
    //     //   console.log('the folder need recode')
    //     // }
    //     const parent = payload.data.parent as string
    //     getFileExplorerInfo(parent)
    //   }
    // }
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
        currentFile={props.currentFile}
      />
    </div>
  )
}

interface RecursiveFileListProps {
  currentFile: string
  folders: Array<RootWorkstationFolderInfo>
  files: Array<string>
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
                <div id="recursive-menu-wrapper" key={uniq}>
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
                      currentFile={props.currentFile}
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
                  filename={getFileBaseName(file)}
                  currentFile={props.currentFile}
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
  currentFile: string
}
const FilesystemFileItem: FC<FilesystemFileItemProps> = props => {
  const { uniq, filename } = props

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
          props.currentFile ==
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
        <TiDocument className="fixed-flex-item" />
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

  function clickAddEffect(type: 'file' | 'folder', prefix: string) {
    return (e: React.MouseEvent) => {
      e.stopPropagation()
      pub('nw-input-pubsub', {
        type: '',
        data: {
          pathType: type,
          replyChannel: 'nw-filesystem-pubsub',
          replyType: 'nw-filesystem-add',
          pathPrefix: prefix
        }
      })
      // PubSub.publish('nw-input-pubsub', {
      //   data: {
      //     pathType: type,
      //     replyChannel: 'nw-filesystem-pubsub',
      //     replyType: 'nw-filesystem-add',
      //     pathPrefix: prefix
      //   } as RenderNewFileType
      // })
    }
  }

  return (
    <div
      ref={refFolder}
      className="filesystem-item"
      id={uniq}
      onClick={props.onClick}
    >
      <InlineFlex>
        {showNest ? (
          <TiFolderOpen className="fixed-flex-item" />
        ) : (
          <TiFolder className="fixed-flex-item" />
        )}
        <span className="text-hide">{name}</span>
      </InlineFlex>
      {addVisible && <AddEffect onClick={clickAddEffect} uniq={uniq} />}
    </div>
  )
}

export default Filesystem
