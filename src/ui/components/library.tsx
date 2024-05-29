// Library system, just need forcuse file content, do not need worry about file name,
// and where to store.

import { css } from '@emotion/css'
import { FC, PropsWithChildren, ReactNode, useState, Fragment } from 'react'
import { VscLibrary, VscSettingsGear } from 'react-icons/vsc'
import { RootWorkstationFolderInfo } from '_types'
import { useLibraryContext } from '../contexts/library-context'

const LibraryNoteCount: FC<
  React.HTMLAttributes<HTMLSpanElement> & PropsWithChildren
> = (props): JSX.Element => {
  const { children, className, ...rest } = props
  const cls = css({
    marginLeft: 'auto'
  })
  const classes = className ? `${cls} ${className}` : cls
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  )
}
const LibraryWrapper: FC<PropsWithChildren> = ({ children }): JSX.Element => {
  return (
    <div
      data-label="library-wrapper"
      className={css({
        userSelect: 'none'
      })}
    >
      {children}
    </div>
  )
}

type LibraryItemWrapperProps = React.HTMLAttributes<HTMLDivElement> &
  PropsWithChildren & { isActive: boolean }
const LibraryItemWrapper: FC<LibraryItemWrapperProps> = (
  props
): JSX.Element => {
  const { className, children, isActive, ...rest } = props
  const cls = css({
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    gap: '10px',
    padding: '10px',
    overflow: 'hidden',
    backgroundColor: isActive ? 'var(--nw-color-blackAlpha-50)' : 'unset',
    ':hover': {
      backgroundColor: 'var(--nw-color-blackAlpha-50)'
    }
  })
  const classes = className ? `${cls} ${className}` : cls
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
const LibraryRoot: FC<
  React.HTMLAttributes<HTMLDivElement> & { isActive: boolean }
> = (props): JSX.Element => {
  const { isActive, ...rest } = props
  const { library } = useLibraryContext()
  return (
    <LibraryItemWrapper isActive={isActive} {...rest}>
      <VscLibrary
        style={{ flex: '0 0 auto', color: 'var(--nw-color-gray-500)' }}
      />
      <span style={{ flex: '0 0 auto', userSelect: 'none' }}>库</span>
      {library && <LibraryNoteCount>{library.files.length}</LibraryNoteCount>}
    </LibraryItemWrapper>
  )
}

interface LibraryItemProps {
  libs: RootWorkstationFolderInfo[]
  parent: string
}
const LibraryItem: FC<LibraryItemProps> = (props): JSX.Element => {
  const { libs, parent } = props
  const { currentLibrary, setCurrentLibrary } = useLibraryContext()

  return (
    <>
      {libs.map(folder => {
        const isActive = currentLibrary === `${parent}/${folder.name}`
        return (
          <LibraryItemWrapper
            key={`./${folder.name}`}
            isActive={isActive}
            onClick={() => {
              setCurrentLibrary(`${parent}/${folder.name}`)
            }}
            style={{ textIndent: 'calc(1em + 30px)' }}
          >
            {folder.name}
            <LibraryNoteCount>
              {folder.subfolders.files.length}
            </LibraryNoteCount>
          </LibraryItemWrapper>
        )
      })}
    </>
  )
}
const LibrarySpecial: FC<LibraryItemProps> = (props): JSX.Element => {
  const { currentLibrary, setCurrentLibrary } = useLibraryContext()
  const { libs, parent } = props
  const iconsCls = css({
    flex: '0 0 auto',
    color: 'var(--nw-color-gray-500)'
  })
  const icons: { [key: string]: ReactNode } = {
    projects: <VscSettingsGear className={iconsCls} />
  }
  return (
    <>
      {libs.map(lib => {
        const fullpath = `${parent}/${lib.name}`
        const isActive = currentLibrary === fullpath
        return (
          <Fragment key={fullpath}>
            <LibraryItemWrapper
              isActive={isActive}
              onClick={() => {
                setCurrentLibrary(fullpath)
              }}
            >
              {icons[lib.name]}
              <span style={{ flex: '0 0 auto' }}>{lib.name}</span>
              <LibraryNoteCount>{lib.subfolders.files.length}</LibraryNoteCount>
            </LibraryItemWrapper>
            <LibraryItem
              libs={lib.subfolders.folders}
              parent={fullpath}
            ></LibraryItem>
          </Fragment>
        )
      })}
    </>
  )
}
const Library: FC = (): JSX.Element => {
  const [_showNest, _setShowNest] = useState<{ [key: string]: boolean }>({})
  const { library, currentLibrary, setCurrentLibrary, specialLibs } =
    useLibraryContext()
  const special: RootWorkstationFolderInfo[] = []
  const normal: RootWorkstationFolderInfo[] = []
  if (library) {
    library.folders.forEach(lib => {
      if (specialLibs.includes(lib.name)) {
        special.push(lib)
        return
      }
      normal.push(lib)
    })
  }

  return (
    <LibraryWrapper>
      <LibraryRoot
        isActive={currentLibrary === '.'}
        onClick={() => {
          if (!library) return
          setCurrentLibrary('.')
        }}
      />
      <LibraryItem libs={normal} parent="." />
      <LibrarySpecial libs={special} parent="." />
    </LibraryWrapper>
  )
}

export default Library
