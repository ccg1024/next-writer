import type { IpcResponse } from 'src/window/ipc/ipc-contract';
import type { ResolvedTheme, ThemeListItem } from 'src/theme/theme-contract';

export type NormalObject = Record<
  string | symbol,
  string | number | symbol | null | undefined | bigint | boolean | NormalObject
>;

// -----------------------------------------------
// For Renderer process
// -----------------------------------------------
const RENDERER_LISTENER_ACTIONS = [
  'execute-command',
  'write-file',
  'external-document-change',
  'search-workspace',
  'open-document-shortcuts',
  'toggle-toc',
  'toggle-lib',
  'toggle-lib-detail',
  'toggle-typewriter-mode'
] as const;
export type RendererListenerAction<T = Record<string, unknown>> = {
  type: (typeof RENDERER_LISTENER_ACTIONS)[number];
  payload?: T;
};
type RendererListenerCallback = (action?: RendererListenerAction) => void;

export interface IPC {
  readConfig: () => Promise<Response<ReadConfigResponse>>;
  listThemes: () => Promise<Response<ThemeStateResponse>>;
  applyTheme: (data: ApplyThemeRequest) => Promise<Response<ResolvedTheme>>;
  readFile: (data: ReadFileRequest) => Promise<Response<ReadFileResponse>>;
  updateLib: (data: UpdateLibRequest) => Promise<Response<UpdateLibResponse>>;
  writeFile: (data: WriteFileRequest) => Promise<Response<RootLibraryTree>>;
  queryRuntimeConfig: () => Promise<Response<RuntimeConfigResponse>>;
  updateRuntimePreference: (data: UpdateRuntimePreferenceRequest) => Promise<Response<RuntimeConfigResponse>>;
  synchronizeWorkspace: () => Promise<Response<RootLibraryTree>>;
  updateCache: (data: UpdateCacheRequest) => Promise<Response<{ success: boolean }>>;
  getDocumentSession: (data: GetDocumentSessionRequest) => Promise<Response<GetDocumentSessionResponse>>;
  updateDocumentSession: (data: UpdateDocumentSessionRequest) => Promise<Response<UpdateDocumentSessionResponse>>;
  flushDocument: (data: FlushDocumentRequest) => Promise<Response<FlushDocumentResponse>>;
  getRecoveryDraft: (data: GetRecoveryDraftRequest) => Promise<Response<GetRecoveryDraftResponse>>;
  recoverDraft: (data: RecoverDraftRequest) => Promise<Response<RecoverDraftResponse>>;
  discardRecoveryDraft: (data: DiscardRecoveryDraftRequest) => Promise<Response<{ success: boolean }>>;
  resolveDocumentConflict: (
    data: ResolveDocumentConflictRequest
  ) => Promise<Response<ResolveDocumentConflictResponse>>;
  saveDocumentCopy: (data: SaveDocumentCopyRequest) => Promise<Response<SaveDocumentCopyResponse>>;
  searchWorkspace: (data: WorkspaceSearchRequest) => Promise<Response<WorkspaceSearchResponse>>;
  getWorkspaceMetadata: () => Promise<Response<WorkspaceMetadata>>;
  updateWorkspaceMetadata: (data: UpdateWorkspaceMetadataRequest) => Promise<Response<WorkspaceMetadata>>;
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

export type DocumentSessionStatus =
  | 'loading'
  | 'ready'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'save-error'
  | 'external-change'
  | 'conflict'
  | 'unavailable';

export type DocumentSession = {
  id: string;
  path: string;
  content: string;
  savedContent: string;
  status: DocumentSessionStatus;
  localRevision: number;
  savedRevision: number;
  diskModifiedTime?: number;
  diskContent?: string;
  lastSavedAt?: number;
  lastError?: string;
};

export type RecoveryDraftSource = 'periodic-snapshot' | 'save-failure' | 'close-timeout';

export type RecoveryDraft = {
  version: 1;
  documentId: string;
  originalPath: string;
  content: string;
  revision: number;
  createdAt: number;
  source: RecoveryDraftSource;
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
type LibraryType = 'folder' | 'file';

type LibraryBase = {
  id: string; // Stable node identity persisted by the main process
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
  id: '__root__';
  children: LibraryTree[];
};

// The runtime information is not stored, but generated at runtime
export type RendererLibraryBase = {
  id: string;
  name: string; // Referer to file name
  type: LibraryType;
  birthTime: string;
  modifiedTime: string;
  description?: string; // Description for file object
  parent?: RendererLibraryTree | RendererRootLibraryTree; // Parent node [runtime information]
  isChange?: boolean // For type 'file', generally, whether file was changed
};

export type RendererLibraryTree = RendererLibraryBase & {
  children: RendererLibraryTree[];
};

export type RendererRootLibraryTree = {
  id: '__root__';
  children: RendererLibraryTree[];
};

export type RendererLibraryNode = RendererRootLibraryTree | RendererLibraryTree;

export type MainProcessMenuStatus = {
  librarySidebar: boolean;
  detailSidebar: boolean;
  tocSidebar: boolean;
  typewriterMode: boolean;
  actionSidebar: boolean; // The Drawer component sidebar which contain delete, rename, etc option for a library or a library's file
};

export type RuntimeConfigResponse = {
  menuStatus: MainProcessMenuStatus;
  autoSave: {
    enabled: boolean;
    delayMs: number;
  };
};

export type UpdateRuntimePreferenceRequest =
  | { preference: 'autoSave.enabled'; value: boolean }
  | { preference: 'typewriterMode'; value: boolean };

// ============================================================
// Just for Ipc communication -- start
// ============================================================

export type Response<T = unknown> = IpcResponse<T>;

// NOTE: the type here is fill to data feild of Response

export type ReadConfigResponse = {
  config: NormalObject;
  libTree: RootLibraryTree;
  themes: ThemeListItem[];
  activeTheme: ResolvedTheme;
};

export type ThemeStateResponse = {
  themes: ThemeListItem[];
  activeTheme: ResolvedTheme;
};

export type ApplyThemeRequest = {
  themeId: string;
};

export type ReadFileRequest = {
  id: string;
};

export type ReadFileResponse = {
  content: string;
  session: DocumentSession;
};

export type WorkspaceRecentDocument = {
  id: string;
  path: string;
  openedAt: number;
};

export type WorkspaceMetadata = {
  version: 1;
  recent: WorkspaceRecentDocument[];
  favoriteIds: string[];
  pinnedIds: string[];
  recentLimit: number;
  invalidPathsCleanedAt: number;
};

export type UpdateWorkspaceMetadataRequest =
  | { action: 'set-favorite'; id: string; value: boolean }
  | { action: 'set-pinned'; id: string; value: boolean }
  | { action: 'clear-recent' };

export type WriteFileRequest = {
  id: string;
  content: string;
  revision?: number;
};

export type FlushDocumentRequest = {
  id: string;
};

export type FlushDocumentResponse = {
  session: DocumentSession;
  libTree: RootLibraryTree;
};

export type UpdateLibRequest =
  | {
      operate: 'add';
      parentId: string;
      type: 'file' | 'folder';
      name: string;
    }
  | {
      operate: 'del';
      id: string;
    }
  | {
      operate: 'rename';
      id: string;
      name: string;
    };

export type UpdateLibResponse = RootLibraryTree;

export type UpdateCacheRequest = {
  id: string;
  content: string;
  isChange: boolean;
  revision?: number;
};

export type GetDocumentSessionRequest = {
  id: string;
};

export type GetDocumentSessionResponse = DocumentSession;

export type UpdateDocumentSessionRequest = {
  id: string;
  content: string;
  revision?: number;
};

export type UpdateDocumentSessionResponse = DocumentSession;

export type GetRecoveryDraftRequest = {
  id: string;
};

export type GetRecoveryDraftResponse = RecoveryDraft | null;

export type RecoverDraftRequest = {
  id: string;
};

export type RecoverDraftResponse = DocumentSession;

export type DiscardRecoveryDraftRequest = {
  id: string;
  createdAt: number;
  revision: number;
};

export type ExternalDocumentChangeEvent = {
  kind: 'reloaded' | 'conflict' | 'deleted';
  session: DocumentSession;
};

export type ResolveDocumentConflictRequest = {
  id: string;
  resolution: 'use-disk' | 'keep-local';
};

export type ResolveDocumentConflictResponse = {
  session: DocumentSession;
  libTree: RootLibraryTree;
};

export type SaveDocumentCopyRequest = {
  id: string;
  content: string;
  revision: number;
};

export type SaveDocumentCopyResponse = {
  copyId: string;
  libTree: RootLibraryTree;
};

export type WorkspaceSearchRequest = {
  query: string;
  caseSensitive?: boolean;
  fuzzy?: boolean;
  offset?: number;
  limit?: number;
};

export type WorkspaceSearchMatchField = 'filename' | 'title' | 'content';

export type WorkspaceSearchResult = {
  id: string;
  path: string;
  name: string;
  title?: string;
  field: WorkspaceSearchMatchField;
  line: number;
  column: number;
  context: string;
  matchStart: number;
  matchEnd: number;
};

export type WorkspaceIndexStatus = 'ready' | 'building' | 'error';

export type WorkspaceSearchResponse = {
  results: WorkspaceSearchResult[];
  total: number;
  hasMore: boolean;
  indexStatus: WorkspaceIndexStatus;
};
// ============================================================
// end -- just for ipc communication
// ============================================================
