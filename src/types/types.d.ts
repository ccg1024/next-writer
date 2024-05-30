import { BrowserWindow, IpcRendererEvent } from 'electron'

type Primitive = string | number | null | undefined | symbol | bigint | boolean
export type Obj = {
  [key: string]: Primitive | Obj
}

// -----------------------------------------------
// For ipc channel type
// -----------------------------------------------

// Editor component
const editorChannel = [
  'typewriter',
  'readfile',
  'insertImage',
  'writefile'
] as const
export type EditorChannelType = (typeof editorChannel)[number]

// Home component
const homeChannel = [
  'toggleSidebar',
  'toggleHeadNav',
  'focusMode',
  'preview',
  'livePreview'
] as const
export type HomeChannelType = (typeof homeChannel)[number]

// sidebar component
const sidebarChannel = ['sidebar-save-empty', 'sidebar-sync-file-tree'] as const
export type SidebarChannelType = (typeof sidebarChannel)[number]

export type IpcChannelDataValue = {
  [key: string]: Primitive | Obj
  manualStatus?: 'pending' | 'rejected' | 'fulfilled'
} & Partial<ReadFileDescriptor> &
  Partial<CheckBoxValue> &
  Partial<RootWorkstationInfo>

// For main to renderer ipc channel
export type IpcChannelData = {
  type: EditorChannelType | HomeChannelType | SidebarChannelType
  value?: IpcChannelDataValue
}

export type CheckBoxValue = {
  checked: boolean
}

// Common type for ipc request and response
export type IpcRequest = {
  type: string
  data?: Obj
}
export type IpcResponseData = {
  status?: string | number
  rootWrokplatformInfo?: RootWorkstationInfo
  workPlatform?: string
  renderConfig?: WriterConfig & Obj
  root?: string
  libraryFile?: string
}
export type IpcResponse = {
  data?: IpcResponseData
  error?: Obj | Primitive
}

// -----------------------------------------------
// For file option
// -----------------------------------------------
const fileType = ['file', 'folder'] as const
type FileType = (typeof fileType)[number]
export type FileDescriptor = {
  isChange: boolean
  path: string
  name: string
}
export type FileDescriptorContainer = {
  [key: string]: FileDescriptor
}
export type FrontMatter = {
  tittle: string
  description: string
}

export type ReadFileDescriptor = {
  // Old name ReadFileIpcValue
  frontMatter: Partial<FrontMatter>
  content: string
  fileDescriptor: FileDescriptor
}
export type AddFileItem = {
  // Old name AddFileBody
  path: string
  option: FileType
}
export type RootWorkstationFolderInfo = {
  name: string
  subfolders: RootWorkstationInfo
  birthtime: string
}
export type FileState = {
  name: string
  mtime: string // 上次修改时间
  birthtime: string // 文件创建时间
} & Partial<FrontMatter>
export type RootWorkstationInfo = {
  folders: Array<RootWorkstationFolderInfo>
  files: Array<FileState>
}

// -----------------------------------------------
// For Renderer process
// -----------------------------------------------

type IpcCallback = (event: IpcRendererEvent, ...args: Array<unknown>) => void
export interface ipc {
  listenEditorChannel: (cb: IpcCallback) => () => void
  listenHomeChannel: (cb: IpcCallback) => () => void
  listenSidebarChannel: (cb: IpcCallback) => () => void
  _invoke_post: (channel: string, req: IpcRequest) => Promise<IpcResponse>
  _render_post: (channel: string, req: IpcRequest) => void
}

export type RendererPlugin = {
  typewriter?: boolean
  hideMarks?: boolean
}

export type RendererConfig = {
  workpath: string // Old name workPath
  modified: boolean
  preview: boolean
  root?: string
  fontSize?: string
  fontFamily?: string
  plugin?: RendererPlugin // Old name rendererPlugin
}

export type PubSubData = {
  type: string
  data: Obj
}

export type RenderNewFileType = {
  pathType: FileType
  replyChannel: string // For component
  replyType: string // For component inner branch
  pathPrefix: string
}

export type HeadNav = {
  title: string
  level: number
  number: number
  jumpPos: number
}

// For nwriter.json config file
export type WriterConfig = {
  editorFont?: string
  codeFont?: string
  uiFont?: string
  uiFontSize?: string
  editorFontSize?: string
  focusMode?: boolean
  typewriter?: boolean
}

// ------------------------------------------------
// For main process
// ------------------------------------------------
export type CacheContent = {
  isChange: boolean
  content: string
}
export type Cache = {
  [key: string]: CacheContent
}
export type UpdateCacheContent = {
  filePath: string
} & Partial<CacheContent>

export type MenuStatus = {
  sideBarVisible: boolean
  hideNavVisible: boolean
  preview: boolean
  livePreview: boolean
}

export type WindowConfig = {
  win: BrowserWindow
  workPlatform: string // Current oppen file location
  root: string // Library file path
  configPath: string // Path to nwriter.json
  logPath: string
  configName: 'nwriter.json'
  rootWorkplatformInfo: RootWorkstationInfo
  stageWorkplatformInfo: RootWorkstationInfo // store to .nwriter.info.json
  renderConfig: WriterConfig & Obj // Config from nwriter.json
  menuStatus: MenuStatus
}

declare global {
  interface Window {
    ipc: ipc
    _next_writer_rendererConfig: RendererConfig
  }
  namespace globalThis {
    /* eslint-disable no-var */
    var _next_writer_windowConfig: WindowConfig
  }
}
