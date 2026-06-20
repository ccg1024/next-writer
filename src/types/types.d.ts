import type { BrowserWindow } from 'electron';
import type { IpcChannel, IpcResponse } from 'src/window/ipc/ipc-contract';

export type NormalObject = Record<
  string | symbol,
  string | number | symbol | null | undefined | bigint | boolean | NormalObject
>;

// -----------------------------------------------
// For Renderer process
// -----------------------------------------------
const RENDERER_LISTENER_ACTIONS = ['write-file', 'toggle-toc', 'toggle-lib', 'toggle-lib-detail'] as const;
export type RendererListenerAction<T = Record<string, unknown>> = {
  type: (typeof RENDERER_LISTENER_ACTIONS)[number];
  payload?: T;
};
export type RendererListenerCallback = (action?: RendererListenerAction) => void;

export interface IPC {
  _post: <T, U>(param: Request<T>) => Promise<Response<U>>;
  readConfig: () => Promise<Response<ReadConfigResponse>>;
  readFile: (data: ReadFileRequest) => Promise<Response<ReadFileResponse>>;
  updateLib: (data: UpdateLibRequest) => Promise<Response<UpdateLibResponse>>;
  writeFile: (data: WriteFileRequest) => Promise<Response<null>>;
  queryRuntimeConfig: () => Promise<Response<{ menuStatus: MainProcessMenuStatus }>>;
  updateCache: (data: UpdateCacheRequest) => Promise<Response<{ success: boolean }>>;
  rendererListener: (cb: RendererListenerCallback) => () => void;
}

// ------------------------------------------------
// For main process
// ------------------------------------------------
export type CacheContent = {
  isChange: boolean;
  content: string;
  revision?: number;
};
export type Cache = {
  [key: string]: CacheContent;
};

declare global {
  interface Window {
    ipc: IPC;
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
export type LibraryType = 'folder' | 'file';

export type LibraryBase = {
  name: string; // Referer to file name
  type: LibraryType;
  birthTime: string;
  modifiedTime: string;
  description?: string; // Description for file object
};

export type LibraryTree = LibraryBase & {
  children: LibraryTree[];
};

export type RootLibraryTree = {
  isRoot: boolean; // Is root library
  children: LibraryTree[];
};

// The runtime information is not stored, but generated at runtime
export type RendererLibraryBase = {
  id?: string; // Generated at runtime [runtime information]
  name: string; // Referer to file name
  type: LibraryType;
  birthTime: string;
  modifiedTime: string;
  description?: string; // Description for file object
  relativePath?: string; // Relative path to curent file or folder [runtime information]
  parent?: RendererLibraryTree; // Parent node [runtime information]
  isChange?: boolean // For type 'file', generally, whether file was changed
};

export type RendererLibraryTree = RendererLibraryBase & {
  children: RendererLibraryTree[];
};

export type MainProcessConfig = Partial<{
  /** @deprecated Use WindowRegistry instead. */
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

// ============================================================
// Just for Ipc communication -- start
// ============================================================

export type Request<T = unknown> = {
  type: IpcChannel;
  data?: T;
};

export type Response<T = unknown> = IpcResponse<T>;

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

export type WriteFileRequest = {
  path: string;
  content: string;
  nameInRuntime?: string; // using to rename
  revision?: number;
};

export type UpdateLibRequest = {
  operate: 'add' | 'del' | 'update';
  path: string;
  type: 'file' | 'folder';
  pathInRuntime?: string;
};

export type UpdateLibResponse = LibraryTree | Record<string, never>;

export type UpdateCacheRequest = {
  path: string;
  content: string;
  isChange: boolean;
  revision?: number;
};
// ============================================================
// end -- just for ipc communication
// ============================================================
