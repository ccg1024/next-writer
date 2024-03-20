import React, { FC, useCallback, useEffect, useRef, useState } from 'react'
import { TiFolder, TiDocument, TiFolderOpen } from 'react-icons/ti'
import PubSub from 'pubsub-js'
import { css } from '@emotion/css'
import { AddEffect, InlineFlex } from './utils'
import { PubSubData, RenderNewFileType } from 'src/types/renderer'
import { getFileBaseName, Post } from '../libs/utils'
import { RootWorkstationFolderInfo, RootWorkstationInfo } from '_common_type'
import { useHoverShow } from '../hooks/useHoverShow'

const Filesystem: FC = (): JSX.Element => {
  const [files, setFiles] = useState<Array<string>>([])
  const [folders, setFolders] = useState<Array<RootWorkstationFolderInfo>>([])
  const [showNest, setShowNest] = useState<{ [key: string]: boolean }>({})
  const callback = useCallback((prop: string) => {
    setShowNest(v => ({
      ...v,
      [prop]: !v[prop]
    }))
  }, [])

  function getFileExplorerInfo(parent?: string) {
    Post('render-to-main-to-render', {
      type: 'read-root-workplatform-info'
    })
      .then(value => {
        if (!value.data) return

        const allInfo = value.data as RootWorkstationInfo

        setFiles(allInfo.files)
        setFolders(allInfo.folders)

        if (parent) {
          setShowNest(v => ({
            ...v,
            [parent]: true
          }))
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
    function listener(_: string, data: PubSubData) {
      if (data.type === 'nw-filesystem-add') {
        // since success add file or folder
        // update state from main process
        // NOTE: since update foders data need recursive, it's not
        // easy on setState fucntion
        // const fileDesc = data.data as RenderNewFileReply
        // if (fileDesc.pathType === 'file') {
        //   setFiles(v => [...v, fileDesc.pathName])
        // } else if (fileDesc.pathType === 'folder') {
        //   // setFolders(v => [...v, fileDesc.pathName])
        //   console.log('the folder need recode')
        // }
        const parent = (data.data as { [key: string]: string }).parent
        getFileExplorerInfo(parent)
      }
    }
    const token = PubSub.subscribe('nw-filesystem-pubsub', listener)

    return () => {
      PubSub.unsubscribe(token)
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

  function click(e: React.MouseEvent) {
    e.stopPropagation()
    // Make post request
    Post(
      'render-to-main',
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
    <div onClick={click} className="filesystem-item" id={uniq}>
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

  function clickAddEffect(type: string, prefix: string) {
    return (e: React.MouseEvent) => {
      e.stopPropagation()
      PubSub.publish('nw-input-pubsub', {
        data: {
          pathType: type,
          replyChannel: 'nw-filesystem-pubsub',
          replyType: 'nw-filesystem-add',
          pathPrefix: prefix
        } as RenderNewFileType
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
