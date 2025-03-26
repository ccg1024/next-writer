import { BrowserWindow, IpcRendererEvent } from 'electron';

export type NormalObject = Record<
  string | symbol,
  string | number | symbol | null | undefined | bigint | boolean | NormalObject
>;

type Primitive = string | number | null | undefined | symbol | bigint | boolean;
export type Obj = {
  [key: string]: Primitive | Obj;
};

// -----------------------------------------------
// For ipc channel type
// -----------------------------------------------

// Editor component
const editorChannel = ['typewriter', 'readfile', 'insertImage', 'writefile'] as const;
export type EditorChannelType = (typeof editorChannel)[number];

// Home component
const homeChannel = [
  'toggleSidebar',
  'toggleMidebar',
  'toggleHeadNav',
  'toggleFloatMenu',
  'focusMode',
  'preview',
  'livePreview',
  'typewriter'
] as const;
export type HomeChannelType = (typeof homeChannel)[number];

// sidebar component
const sidebarChannel = ['sidebar-save-empty', 'sidebar-sync-file-tree'] as const;
export type SidebarChannelType = (typeof sidebarChannel)[number];

export type IpcChannelDataValue = {
  [key: string]: Primitive | Obj;
  manualStatus?: 'pending' | 'rejected' | 'fulfilled';
  workInPath?: string;
} & Partial<ReadFileDescriptor> &
  Partial<CheckBoxValue> &
  Partial<RootWorkstationInfo>;

// For main to renderer ipc channel
export type IpcChannelData = {
  type: EditorChannelType | HomeChannelType | SidebarChannelType;
  value?: IpcChannelDataValue;
};

export type CheckBoxValue = {
  checked: boolean;
};

// Common type for ipc request and response
export type IpcRequest = {
  type: string;
  data?: Obj;
};
export type IpcResponseData = {
  status?: string | number;
  rootWrokplatformInfo?: RootWorkstationInfo;
  workPlatform?: string;
  renderConfig?: WriterConfig & Obj;
  root?: string;
  libraryFile?: string;
};
export type IpcResponse = {
  data?: IpcResponseData;
  error?: Obj | Primitive;
};

// -----------------------------------------------
// For file option
// -----------------------------------------------
const fileType = ['file', 'folder'] as const;
type FileType = (typeof fileType)[number];
export type FileDescriptor = {
  isChange: boolean;
  path: string;
  name: string;
};
export type FileDescriptorContainer = {
  [key: string]: FileDescriptor;
};
export type FrontMatter = {
  tittle: string;
  description: string;
};

export type ReadFileDescriptor = {
  // Old name ReadFileIpcValue
  frontMatter: Partial<FrontMatter>;
  content: string;
  fileDescriptor: FileDescriptor;
};
export type AddFileItem = {
  // Old name AddFileBody
  path: string;
  option: FileType;
};
export type RootWorkstationFolderInfo = {
  name: string;
  subfolders: RootWorkstationInfo;
  birthtime: string;
};
export type FileState = {
  name: string;
  mtime: string; // 上次修改时间
  birthtime: string; // 文件创建时间
} & Partial<FrontMatter>;
export type RootWorkstationInfo = {
  folders: Array<RootWorkstationFolderInfo>;
  files: Array<FileState>;
};

// -----------------------------------------------
// For Renderer process
// -----------------------------------------------

type IpcCallback = (event: IpcRendererEvent, ...args: Array<unknown>) => void;
export interface IPC {
  listenEditorChannel: (cb: IpcCallback) => () => void;
  listenHomeChannel: (cb: IpcCallback) => () => void;
  listenSidebarChannel: (cb: IpcCallback) => () => void;
  _invoke_post: (channel: string, req: IpcRequest) => Promise<IpcResponse>;
  _render_post: (channel: string, req: IpcRequest) => void;
  _post: <T, U>(param: Request<T>) => Promise<Response<U>>;
}

export type RendererPlugin = {
  typewriter?: boolean;
  hideMarks?: boolean;
};

export type RendererConfig = {
  workpath: string; // Old name workPath
  modified: boolean;
  preview: boolean;
  root?: string;
  fontSize?: string;
  fontFamily?: string;
  plugin?: RendererPlugin; // Old name rendererPlugin
};

export type PubSubData = {
  type: string;
  data: Obj;
};

export type RenderNewFileType = {
  pathType: FileType;
  replyChannel: string; // For component
  replyType: string; // For component inner branch
  pathPrefix: string;
};

export type HeadNav = {
  title: string;
  level: number;
  number: number;
  jumpPos: number;
};

// For nwriter.json config file
export type WriterConfig = {
  editorFont?: string;
  codeFont?: string;
  uiFont?: string;
  uiFontSize?: string;
  editorFontSize?: string;
  focusMode?: boolean;
  typewriter?: boolean;
};

// ------------------------------------------------
// For main process
// ------------------------------------------------
export type CacheContent = {
  isChange: boolean;
  content: string;
};
export type Cache = {
  [key: string]: CacheContent;
};
export type UpdateCacheContent = {
  filePath: string;
} & Partial<CacheContent>;

export type MenuStatus = {
  sideBarVisible: boolean;
  mideBarVisible: boolean;
  hideNavVisible: boolean; // head-nav
  floatMenuVisible: boolean;
  preview: boolean;
  livePreview: boolean;
};

export type WindowConfig = {
  win: BrowserWindow;
  workPlatform: string; // Current oppen file location
  root: string; // Library file path
  configPath: string; // Path to nwriter.json
  logPath: string;
  configName: 'nwriter.json';
  rootWorkplatformInfo: RootWorkstationInfo;
  stageWorkplatformInfo: RootWorkstationInfo; // store to .nwriter.info.json
  renderConfig: WriterConfig & Obj; // Config from nwriter.json
  menuStatus: MenuStatus;
};

declare global {
  interface Window {
    ipc: IPC;
    _next_writer_rendererConfig: RendererConfig;
  }
  namespace globalThis {
    /* eslint-disable no-var */
    var _next_writer_windowConfig: WindowConfig;
  }
}

/**
 * Just try to rebuild some code. The matters are as follows
 *
 * 1. Rebuild library system, using new data structure `LibraryTree` to replace `RootWorkstationInfo`
 * 2. Refactoring inter-module communication, using `MainGlobal` instance to repalce `global._next_writer_windowConfig`
 * 3. Removing preview module, just keep hybride mode of the editor temporarily
 * 4. Refactoring cache system with `Cache` instance
 * 5. Removing the ability to open external filse directly
 * 6. If the image is imported via next-writer, cache the image in library in preparation for file upload
 * 7. Removing ui font-family and font-size config
 *
 * @update 2024-09-21
 * @author crazycodegame
 *
 * */
// ============================================================
// ==                    New Type define                     ==
// ============================================================
export const NEXT_WRITER_VERSION = 'v0.0.1';

export type LibraryType = 'folder' | 'file';

export type LibraryBase = {
  id?: string; // Generated at runtime
  name: string;
  type: LibraryType;
  birthTime: string;
  modifiedTime: string;
};

export type LibraryTree = LibraryBase & {
  children: LibraryTree[];
};

export type LibraryDetail = LibraryBase & { content: string };

export type MainProcessConfig = Partial<{
  win: BrowserWindow; // Current BrowserWindow instance
  rootDir: string; // Absolute path of library
  configDir: string; // next-writer configuration path
  logDir: string; // next-writer log file storage path
  menuStatus: MainProcessMenuStatus; // Record optional menu status, true or false, true means that the menu option is applied
  renderConfig: NormalObject;
  libraryTree: LibraryTree;
}>;

export type MainProcessMenuStatus = {
  librarySidebar: boolean;
  detailSidebar: boolean;
  tocSidebar: boolean;
  actionSidebar: boolean; // The Drawer component sidebar which contain delete, rename, etc option for a library or a library's file
};

export type DeepReadOnly<T extends Record<string | symbol, unknown>> = {
  readonly [K in keyof T]: DeepReadOnly<T[K]>;
};

// ============================================================
// Just for Ipc communication -- start
// ============================================================

export type Request<T> = {
  type: string;
  data?: T;
};

export type Response<T> = {
  status: number;
  data: T;
  message?: string;
};

// NOTE: the type here is fill to data feild of Request or Response

export type ReadConfigResponse = {
  config: NormalObject;
  libTree: LibraryTree;
};

export type ReadFileRequest = {
  path: string;
};

export type ReadFileResponse = {
  content: string;
};
// ============================================================
// end -- just for ipc communication
// ============================================================

export type RequestAddLibOrFile = {
  type: 'file' | 'folder';
  path: string;
};

export type RequestDelLibOrFile = RequestAddLibOrFile;
