import { css } from '@emotion/css'
import { motion } from 'framer-motion'
import {
  FC,
  PropsWithChildren,
  ReactNode,
  useCallback,
  useRef,
  useState
} from 'react'
import { createPortal } from 'react-dom'
import { TiEdit, TiFolderAdd } from 'react-icons/ti'
import { VscLibrary } from 'react-icons/vsc'
import { TWO_WAY_CHANNEL } from 'src/config/ipc'
import { RootWorkstationInfo } from '_types'
import { useLibraryContext } from '../contexts/library-context'
import {
  findFolderIndex,
  isValidFileName,
  Post,
  timeDistance
} from '../libs/utils'
import { AbsoluteFullNoteLogo } from './logo'
import { Spinner } from './utils'

type NativeDivAttributes = React.HTMLAttributes<HTMLDivElement>
type PaddingProps = {
  paddingTop?: string
}

interface InterActiveInputButtonProps {
  onClick?: () => void
  backgroundColor?: string
  children?: ReactNode
  type?: 'button' | 'submit' | 'reset'
}
const InterActiveInputButton: FC<InterActiveInputButtonProps> = props => {
  const cls = css({
    padding: '10px 15px',
    backgroundColor: props.backgroundColor ? props.backgroundColor : '#ccc',
    borderRadius: '5px',
    border: 'none',
    letterSpacing: '.1em',
    ':hover': {
      cursor: 'pointer'
    }
  })
  return (
    <motion.button
      className={cls}
      whileTap={{ scale: 0.8 }}
      onClick={props.onClick ? props.onClick : null}
      type={props.type ? props.type : 'button'}
    >
      {props.children}
    </motion.button>
  )
}

interface InterActiveInputProps {
  lib: string
  close: () => void
}
const InterActiveInput: FC<InterActiveInputProps> = (props): JSX.Element => {
  const [err, setErr] = useState<string>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const { getLibrary } = useLibraryContext()
  const { close, lib } = props
  const cls = css({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 150
  })
  const maskCls = css({
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: '100%',
    height: '100%'
  })
  const formCls = css({
    position: 'relative',
    margin: 'auto',
    width: '60%',
    top: '30%',
    boxSizing: 'border-box',
    padding: '30px',
    backgroundColor: 'white',
    borderRadius: '10px'
  })
  const inputCls = css({
    width: '100%',
    fontSize: '20px',
    boxSizing: 'border-box',
    padding: '10px',
    border: '2px solid black',
    borderRadius: '4px',
    letterSpacing: '.05em',
    backgroundColor: loading ? 'var(--nw-color-gray-100)' : 'unset',
    '&:focus': {
      outlineColor: '#4299e1'
    }
  })
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!lib) return

    const form = e.currentTarget as HTMLFormElement
    const formData = new FormData(form)
    const inputValue = formData.get('inputValue')

    if (!isValidFileName(inputValue.toString())) {
      setErr(
        '库名格式错误，确保输入正确的文件名称且不是隐藏文件，不包含空格字符'
      )
      return
    }

    setLoading(true)
    Post(TWO_WAY_CHANNEL, {
      type: 'add-library',
      data: { library: lib, newLibName: inputValue.toString() }
    })
      .then(res => {
        if (!res) return
        if (res.data.status !== 'success') {
          setErr('The response body data not equal success, some thing wrong')
          return
        }
        // re-render library and close input
        getLibrary()
        close()
      })
      .catch(reason => {
        if (typeof reason === 'string') {
          setErr(reason)
          return
        }
        if (typeof reason.message === 'string') {
          const formateMessage = /^.*\[next-writer\]:\s(.*)$/.exec(
            reason.message
          )
          if (formateMessage && formateMessage.length > 1) {
            setErr(formateMessage[1])
            return
          }
          setErr(reason.message)
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }
  const header = (
    <div
      className={css({
        paddingBottom: '10px',
        marginBottom: '20px',
        borderBottom: '1px solid #ccc',
        fontSize: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontWeight: 'bold',
        color: 'GrayText'
      })}
    >
      <VscLibrary />
      添加新库
    </div>
  )
  const footer = (
    <div
      className={css({
        padding: '10px',
        boxSizing: 'border-box',
        borderTop: '1px solid #ccc',
        marginTop: '20px',
        display: 'flex',
        justifyContent: 'right',
        gap: '10px',
        paddingBottom: '0px'
      })}
    >
      <InterActiveInputButton onClick={close}>取消</InterActiveInputButton>
      <InterActiveInputButton backgroundColor="#4299e1" type="submit">
        确认
      </InterActiveInputButton>
    </div>
  )
  const dom = (
    <div className={cls}>
      <div className={maskCls} onClick={close}></div>
      <form className={formCls} onSubmit={onSubmit}>
        {header}
        <input
          className={inputCls}
          autoFocus
          name="inputValue"
          placeholder="输入库名"
          disabled={loading}
        />
        {err && (
          <div
            className={css({
              marginTop: '10px',
              color: 'red',
              fontSize: '16px'
            })}
          >
            {err}
          </div>
        )}
        {loading && (
          <Spinner
            className={css({
              position: 'absolute',
              right: '5px',
              top: '5px'
            })}
          />
        )}
        {footer}
      </form>
    </div>
  )
  return createPortal(dom, document.body)
}

const InterActiveIconWrapper: FC<
  React.HTMLAttributes<HTMLDivElement> & PropsWithChildren
> = (props): JSX.Element => {
  const { children, className, ...rest } = props
  const cls = css({
    cursor: 'pointer',
    display: 'flex',
    color: 'var(--nw-color-gray-500)'
  })
  const classes = className ? `${cls} ${className}` : cls
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
const DetailBarTopRight: FC<PaddingProps> = (props): JSX.Element => {
  const { paddingTop } = props
  const { currentLibrary, getLibrary, openLibFile } = useLibraryContext()
  const refShouldAdd = useRef<boolean>(true)
  const addLibraryFile = () => {
    // make sure just add one file during seconds time
    // there are 1.5s dead time that cannot add new file after add one.
    if (!currentLibrary) return
    if (!refShouldAdd.current) return

    Post(TWO_WAY_CHANNEL, {
      type: 'add-library-file',
      data: { library: currentLibrary }
    }).then(res => {
      if (!res) return
      if (res.data.status !== 'success') {
        throw new Error('Something wrong with add library file')
      }
      const { libraryFile } = res.data
      if (!libraryFile) {
        throw new Error('New library file path is empty')
      }
      getLibrary()
      openLibFile(libraryFile)()
    })
    refShouldAdd.current = false
    setTimeout(() => {
      refShouldAdd.current = true
    }, 1500)
  }
  return (
    <div
      className={css`
        position: absolute;
        top: 50%;
        right: 0;
        transform: translateY(-50%);
        padding: 5px;
        box-sizing: border-box;
        font-size: 20px;
        -webkit-app-region: no-drag;
        padding-top: ${paddingTop ? paddingTop : '5px'};
      `}
    >
      <InterActiveIconWrapper onClick={addLibraryFile}>
        <TiEdit />
      </InterActiveIconWrapper>
    </div>
  )
}
const DetailBarTopLeft: FC<PaddingProps> = (props): JSX.Element => {
  const { paddingTop } = props
  const [showInput, setShowInput] = useState(false)
  const { currentLibrary, specialLibs } = useLibraryContext()
  const token = currentLibrary ? currentLibrary.split('/') : null
  const certifacation = token ? token[token.length - 1] : null
  const visible = certifacation === '.' || specialLibs.includes(certifacation)
  const closeInput = useCallback(() => {
    setShowInput(false)
  }, [])
  return (
    <div
      className={css`
        position: absolute;
        top: 50%;
        left: 0;
        transform: translateY(-50%);
        padding: 5px;
        box-sizing: border-box;
        font-size: 20px;
        -webkit-app-region: no-drag;
        padding-top: ${paddingTop ? paddingTop : '5px'};
      `}
    >
      {visible && (
        <InterActiveIconWrapper onClick={() => setShowInput(true)}>
          <TiFolderAdd />
        </InterActiveIconWrapper>
      )}
      {showInput && (
        <InterActiveInput close={closeInput} lib={currentLibrary} />
      )}
    </div>
  )
}
const DetailBarTopTitle: FC<PropsWithChildren> = ({
  children
}): JSX.Element => {
  return (
    <div
      className={css`
        font-size: 20px;
        letter-spacing: 0.1em;
        text-align: center;
        color: var(--nw-color-gray-500);
      `}
    >
      {children === '.' ? '库' : children}
    </div>
  )
}

const DetailBarTop: FC<NativeDivAttributes & PaddingProps> = (
  props
): JSX.Element => {
  const { className, paddingTop, ...rest } = props
  const { currentLibrary } = useLibraryContext()
  const tokens = currentLibrary ? currentLibrary.split('/') : ['库']
  const cls = css`
    padding: 5px;
    -webkit-app-region: drag;
    position: relative;
    border-bottom: 1px solid #ccc;
    padding-top: ${paddingTop ? paddingTop : '5px'};
  `
  const classes = className ? `${cls} ${className}` : cls
  return (
    <>
      {currentLibrary && (
        <div className={classes} {...rest}>
          <DetailBarTopTitle>
            {tokens && tokens[tokens.length - 1]}
          </DetailBarTopTitle>
          <DetailBarTopRight paddingTop={paddingTop} />
          <DetailBarTopLeft paddingTop={paddingTop} />
        </div>
      )}
    </>
  )
}
interface DetailBarWrapperProps {
  children?: ReactNode
}
const DetailBarWrapper: FC<DetailBarWrapperProps> = (props): JSX.Element => {
  const { children } = props
  return (
    <div
      className={css({
        width: '300px',
        height: '100%',
        backgroundColor: '#F5F5F5',
        borderLeft: '1px solid #ccc',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'relative'
      })}
    >
      {children}
    </div>
  )
}
const DetailBarBodyWrapper: FC<PropsWithChildren> = props => {
  const { children } = props

  return (
    <div
      className={css({
        flexGrow: 1,
        overflow: 'auto'
      })}
    >
      {children}
    </div>
  )
}

const NoteItemWrapper: FC<
  React.HTMLAttributes<HTMLDivElement> & PropsWithChildren
> = (props): JSX.Element => {
  const { children, className, ...rest } = props
  const cls = css({
    padding: '10px',
    userSelect: 'none',
    borderBottom: '1px solid #ccc',
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
const NoteItemTitle: FC<PropsWithChildren> = ({ children }): JSX.Element => {
  return (
    <header>
      <h3 style={{ marginBlockStart: '0.2em', marginBlockEnd: '0.2em' }}>
        {children}
      </h3>
    </header>
  )
}
const NoteItemInfo: FC<PropsWithChildren & NativeDivAttributes> = (
  props
): JSX.Element => {
  const { children, className: _, ...rest } = props
  return (
    <div
      className={css({
        marginBlockEnd: '0.2em',
        marginBlockStart: '0.2em',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        overflow: 'hidden'
      })}
      {...rest}
    >
      {children}
    </div>
  )
}
interface NoteItemProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  mtime: string
  description: string
}
const NoteItem: FC<NoteItemProps> = (props): JSX.Element => {
  const { name, mtime, description, ...rest } = props
  return (
    <NoteItemWrapper {...rest}>
      <NoteItemTitle>{name ? name : 'untitled'}</NoteItemTitle>
      <NoteItemInfo style={{ color: 'var(--nw-color-gray-500)' }}>
        {timeDistance(mtime)}
      </NoteItemInfo>
      <NoteItemInfo>{description ? description : '<empty>'}</NoteItemInfo>
    </NoteItemWrapper>
  )
}

interface DetailBarProps {
  isLibBarVisible: boolean
}
const DetailBar: FC<DetailBarProps> = (props): JSX.Element => {
  const { isLibBarVisible } = props
  const { library, currentLibrary, currentFile, openLibFile } =
    useLibraryContext()

  const getNotes = (lib: RootWorkstationInfo, currentLibrary: string) => {
    if (!lib || !currentLibrary) return null
    if (currentLibrary === '.') return lib.files

    let tempLib = lib
    const tokens = currentLibrary.split('/')
    if (tokens[0] === '.') tokens.shift()

    for (let i = 0; i < tokens.length; i++) {
      const idx = findFolderIndex(tempLib.folders, tokens[i])
      if (idx === -1) return null
      tempLib = tempLib.folders[idx].subfolders
    }
    return tempLib.files
  }
  const notes = getNotes(library, currentLibrary)
  return (
    <DetailBarWrapper>
      <DetailBarTop paddingTop={isLibBarVisible ? null : '20px'} />
      <DetailBarBodyWrapper>
        {notes &&
          notes.map(note => {
            const fullpath = `${currentLibrary}/${note.name}`
            const isActive = currentFile === fullpath
            return (
              <NoteItem
                key={fullpath}
                name={note.tittle}
                mtime={note.mtime}
                description={note.description}
                data-id={fullpath}
                onClick={isActive ? null : openLibFile(fullpath)}
                className={css({
                  backgroundColor: isActive
                    ? 'var(--nw-color-blackAlpha-50)'
                    : 'unset'
                })}
              />
            )
          })}
      </DetailBarBodyWrapper>
      {!currentLibrary && (
        <AbsoluteFullNoteLogo
          className={css({
            fontSize: '20vh !important',
            backgroundColor: '#F5F5F5 !important',
            color: 'var(--nw-color-gray-200) !important'
          })}
        />
      )}
    </DetailBarWrapper>
  )
}

export default DetailBar
