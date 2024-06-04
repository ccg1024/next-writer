import React, {
  createContext,
  FC,
  PropsWithChildren,
  useEffect,
  useState
} from 'react'
import { ONE_WAY_CHANNEL, TWO_WAY_CHANNEL } from 'src/config/ipc'
import { FRONTMATTERKEYS } from 'src/config/keys'
import { FileState, RootWorkstationInfo } from '_types'
import { Post, findFolderIndex } from '../libs/utils'

type LibraryContextValue = {
  library: RootWorkstationInfo
  currentFile: string
  currentLibrary: string
  // notes: Array<FileState>
  specialLibs: Array<string>
  setCurrentFile: (nextFile: string) => void
  setCurrentLibrary: (nextLibrary: string) => void
  // setNotes: (nextNotes: Array<FileState>) => void
  openLibFile: (filepath: string) => () => void
  getLibrary: () => void
  saveFile: (doc: string) => void
  getFileState: (state: keyof FileState) => string
  setFileState: (state: keyof FileState, value: string) => void
}

const LibraryContext = createContext<LibraryContextValue>(null)

const LibraryProvider: FC<PropsWithChildren> = props => {
  const [currentFile, setCurrentFile] = useState<string>(null)
  const [currentLibrary, setCurrentLibrary] = useState<string>(null)
  // files of current library
  // const [notes, setNotes] = useState<Array<FileState>>([])
  const [library, setLibrary] = useState<RootWorkstationInfo>(null)

  const specialLibs = ['projects']

  function getLibrary() {
    Post(TWO_WAY_CHANNEL, { type: 'read-root-workplatform-info' })
      .then(res => {
        if (!res || !res.data) return

        const { rootWrokplatformInfo } = res.data
        setLibrary(rootWrokplatformInfo)
        // setLibrary(_test)
      })
      .catch(err => {
        throw err
      })
  }
  useEffect(() => {
    // get Library when component mount
    getLibrary()
  }, [])
  const getCurrentNote = () => {
    if (!library || !currentFile) return null

    let tempLib = library
    const libTokens = currentLibrary.split('/')
    if (libTokens[0] === '.') libTokens.shift()
    for (let i = 0; i < libTokens.length; i++) {
      const idx = findFolderIndex(tempLib.folders, libTokens[i])
      if (idx === -1) return null
      tempLib = tempLib.folders[idx].subfolders
    }
    const _notes = tempLib.files
    const tokens = currentFile.split('/')
    const target = tokens[tokens.length - 1]
    for (let i = 0; i < _notes.length; i++) {
      if (_notes[i].name === target) return _notes[i]
    }

    return null
  }
  function openLibFile(filePath: string) {
    return () => {
      Post(ONE_WAY_CHANNEL, { type: 'open-file', data: { filePath } }, true)
    }
  }
  function logFrontMatterProperties(note: FileState) {
    if (!note) return '---\n---\n'
    let data = ''
    FRONTMATTERKEYS.forEach(key => {
      if (key in note) {
        data += `${key}: '${note[key].replace(/['"]/g, '‘').replace(/\n/g, '  ')}'\n`
      }
    })

    return `---\n${data}---\n`
  }
  function generateFullContent(doc: string) {
    const note = getCurrentNote()
    const frontMatter = logFrontMatterProperties(note)
    return `${frontMatter}${doc}`
  }
  function saveFile(doc: string) {
    const fullDoc = generateFullContent(doc)
    Post(
      ONE_WAY_CHANNEL,
      { type: 'save-library-file', data: { content: fullDoc } },
      true
    )
      .then(() => {
        getLibrary()
      })
      .catch(err => {
        throw err
      })
  }
  const getFileState = (state: keyof FileState) => {
    const note = getCurrentNote()
    if (!note) return null
    return note[state]
  }
  function updateLibrary(
    lib: RootWorkstationInfo,
    pathlist: Array<string>,
    state: keyof FileState,
    value: string
  ) {
    if (pathlist.length === 0) return

    const subpath = pathlist.shift()

    if (pathlist.length === 0) {
      // find note
      let idx = -1
      for (let i = 0; i < lib.files.length; i++) {
        if (lib.files[i].name === subpath) {
          idx = i
          break
        }
      }
      if (idx === -1)
        throw new Error(
          `Cannot find file name: ${subpath} in recursiveUpdateWorkstationInfoWithWrite final if`
        )
      lib.files[idx] = {
        ...lib.files[idx],
        [state]: value
      }
    } else {
      let idx = -1
      for (let i = 0; i < lib.folders.length; i++) {
        if (lib.folders[i].name === subpath) {
          idx = i
          break
        }
      }
      if (idx === -1)
        throw new Error(
          `Cannot find folder name: ${subpath} in library-context`
        )
      updateLibrary(lib.folders[idx].subfolders, pathlist, state, value)
    }
  }
  function setFileState(state: keyof FileState, value: string) {
    if (!currentFile || !library) return
    const tokens = currentFile.split('/')
    // const currentName = tokens[tokens.length - 1]
    const nextLibrary = { ...library }
    updateLibrary(nextLibrary, tokens.slice(1), state, value)
    setLibrary(nextLibrary)
    // setNotes(v => {
    //   return v.map(note => {
    //     if (note.name === currentName) {
    //       return {
    //         ...note,
    //         [state]: value
    //       }
    //     }
    //     return { ...note }
    //   })
    // })
    Post(
      ONE_WAY_CHANNEL,
      {
        type: 'update-library-front-matter',
        data: { state, stateValue: value }
      },
      true
    )
  }
  return (
    <LibraryContext.Provider
      value={{
        // notes,
        library,
        currentFile,
        currentLibrary,
        specialLibs,
        // setNotes,
        setCurrentFile,
        setCurrentLibrary,
        openLibFile,
        getLibrary,
        saveFile,
        getFileState,
        setFileState
      }}
    >
      {props.children}
    </LibraryContext.Provider>
  )
}

export const useLibraryContext = () => {
  return React.useContext(LibraryContext)
}

export default LibraryProvider
