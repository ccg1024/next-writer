import { css } from '@emotion/css'
import { FC, PropsWithChildren, useState } from 'react'
import { RootWorkstationInfo } from '_types'
import { useLibraryContext } from '../contexts/library-context'
import { findFileIndex, findFolderIndex } from '../libs/utils'

const FrontMatterItem: FC<PropsWithChildren> = ({ children }): JSX.Element => {
  return <div className={css({ marginBottom: '5px' })}>{children}</div>
}
const FrontMatterDescription: FC<PropsWithChildren> = ({
  children
}): JSX.Element => {
  return (
    <FrontMatterItem>
      <div
        className={css({
          color: 'var(--nw-color-gray-500)',
          fontSize: '.8em',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
          overflow: 'hidden'
        })}
      >
        {children}
      </div>
    </FrontMatterItem>
  )
}
const FrontMatterTitle: FC<PropsWithChildren> = ({ children }): JSX.Element => {
  const _stage = typeof children === 'string' ? children : 'untitled'
  const [isEdit, setIsEdit] = useState(false)
  const [stageValue, setStageValue] = useState<string>('')
  const { setFileState } = useLibraryContext()
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFileState('tittle', stageValue)
    setIsEdit(false)
  }
  const onBlur = () => {
    setStageValue(_stage)
    setIsEdit(false)
  }
  const showEdit = () => {
    setStageValue(_stage)
    setIsEdit(true)
  }
  return (
    <FrontMatterItem>
      {!isEdit && (
        <h2
          className={css({
            margin: '0',
            display: 'inline'
          })}
          onClick={showEdit}
        >
          {children}
        </h2>
      )}
      {isEdit && (
        <form onSubmit={onSubmit} style={{ position: 'relative' }}>
          <input
            className={css({
              width: '100%',
              fontSize: '1.5em',
              fontWeight: 'bold',
              border: 'unset',
              outline: 'unset',
              padding: 0,
              letterSpacing: 'var(--nw-letter-spacing)',
              boxSizing: 'border-box',
              fontFamily: 'var(--nw-editor-font-family)',
              paddingBlock: 0,
              paddingInline: 0
            })}
            autoFocus
            placeholder="输入标题"
            onBlur={onBlur}
            value={stageValue}
            onChange={e => setStageValue(e.target.value)}
          />
          <hr
            className={css({
              position: 'absolute',
              width: '100%',
              bottom: 0,
              margin: 0,
              borderColor: '#4299E1'
            })}
          />
        </form>
      )}
    </FrontMatterItem>
  )
}
const FrontMatterWrapper: FC<PropsWithChildren> = ({
  children
}): JSX.Element => {
  return (
    <div
      className={css({
        position: 'relative',
        padding: '20px 0',
        width: '80%',
        margin: 'auto',
        maxWidth: '580px',
        fontFamily: 'var(--nw-editor-font-family)',
        letterSpacing: 'var(--nw-letter-spacing)',
        '::after': {
          content: "''",
          width: '100%',
          position: 'absolute',
          height: '2px',
          bottom: '-2px',
          background:
            'linear-gradient(to bottom, rgba(204, 204, 204, 0.5), transparent)'
        }
      })}
    >
      {children}
    </div>
  )
}
const FrontMatter: FC = (): JSX.Element => {
  const { library, currentFile } = useLibraryContext()
  const getCurrentNotes = (library: RootWorkstationInfo, noteName: string) => {
    if (!noteName) return null
    const tokens = noteName.split('/')
    if (tokens[0] === '.') tokens.shift()
    let tempLib = library
    for (let i = 0; i < tokens.length; i++) {
      if (i < tokens.length - 1) {
        // find folder
        const idx = findFolderIndex(tempLib.folders, tokens[i])
        if (idx === -1) return null
        tempLib = tempLib.folders[idx].subfolders
        continue
      }
      const idx = findFileIndex(tempLib.files, tokens[i])
      if (idx === -1) return null
      return tempLib.files[idx]
    }
    return null
  }
  const currentNote = getCurrentNotes(library, currentFile)
  return (
    <FrontMatterWrapper>
      <FrontMatterTitle>
        {currentNote
          ? currentNote.tittle
            ? currentNote.tittle
            : 'untitled'
          : 'untitled'}
      </FrontMatterTitle>
      <FrontMatterDescription>
        {currentNote
          ? currentNote.description
            ? currentNote.description
            : 'no description'
          : 'no description'}
      </FrontMatterDescription>
    </FrontMatterWrapper>
  )
}

export default FrontMatter
