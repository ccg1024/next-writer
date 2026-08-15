import type {
  ApplyThemeRequest,
  DiscardRecoveryDraftRequest,
  DocumentSession,
  FlushDocumentRequest,
  FlushDocumentResponse,
  GetDocumentSessionRequest,
  GetRecoveryDraftRequest,
  GetRecoveryDraftResponse,
  ReadConfigResponse,
  ReadFileRequest,
  ReadFileResponse,
  RecoverDraftRequest,
  RootLibraryTree,
  RuntimeConfigResponse,
  ThemeStateResponse,
  UpdateCacheRequest,
  UpdateDocumentSessionRequest,
  UpdateLibRequest,
  UpdateLibResponse,
  WriteFileRequest
} from '_types';
import type { ResolvedTheme } from 'src/theme/theme-contract';

export const IPC_SERVER_NAME = 'next-ipc-server';

export const IPC_CHANNEL = {
  READ_CONFIG: 'read-config',
  LIST_THEMES: 'list-themes',
  APPLY_THEME: 'apply-theme',
  READ_FILE: 'read-file',
  UPDATE_LIB: 'update-lib',
  WRITE_FILE: 'write-file',
  /** @deprecated Use WRITE_FILE instead. */
  WIRTE_FILE: 'write-file',
  RUNTIME: 'runtime',
  UPDATE_CACHE: 'update-cache',
  GET_DOCUMENT_SESSION: 'get-document-session',
  UPDATE_DOCUMENT_SESSION: 'update-document-session',
  FLUSH_DOCUMENT: 'flush-document',
  GET_RECOVERY_DRAFT: 'get-recovery-draft',
  RECOVER_DRAFT: 'recover-draft',
  DISCARD_RECOVERY_DRAFT: 'discard-recovery-draft'
} as const;

export type IpcChannel = (typeof IPC_CHANNEL)[keyof typeof IPC_CHANNEL];

type IpcRequestMap = {
  [IPC_CHANNEL.READ_CONFIG]: undefined;
  [IPC_CHANNEL.LIST_THEMES]: undefined;
  [IPC_CHANNEL.APPLY_THEME]: ApplyThemeRequest;
  [IPC_CHANNEL.READ_FILE]: ReadFileRequest;
  [IPC_CHANNEL.UPDATE_LIB]: UpdateLibRequest;
  [IPC_CHANNEL.WRITE_FILE]: WriteFileRequest;
  [IPC_CHANNEL.RUNTIME]: undefined;
  [IPC_CHANNEL.UPDATE_CACHE]: UpdateCacheRequest;
  [IPC_CHANNEL.GET_DOCUMENT_SESSION]: GetDocumentSessionRequest;
  [IPC_CHANNEL.UPDATE_DOCUMENT_SESSION]: UpdateDocumentSessionRequest;
  [IPC_CHANNEL.FLUSH_DOCUMENT]: FlushDocumentRequest;
  [IPC_CHANNEL.GET_RECOVERY_DRAFT]: GetRecoveryDraftRequest;
  [IPC_CHANNEL.RECOVER_DRAFT]: RecoverDraftRequest;
  [IPC_CHANNEL.DISCARD_RECOVERY_DRAFT]: DiscardRecoveryDraftRequest;
};

type IpcResponseMap = {
  [IPC_CHANNEL.READ_CONFIG]: ReadConfigResponse;
  [IPC_CHANNEL.LIST_THEMES]: ThemeStateResponse;
  [IPC_CHANNEL.APPLY_THEME]: ResolvedTheme;
  [IPC_CHANNEL.READ_FILE]: ReadFileResponse;
  [IPC_CHANNEL.UPDATE_LIB]: UpdateLibResponse;
  [IPC_CHANNEL.WRITE_FILE]: RootLibraryTree;
  [IPC_CHANNEL.RUNTIME]: RuntimeConfigResponse;
  [IPC_CHANNEL.UPDATE_CACHE]: { success: boolean };
  [IPC_CHANNEL.GET_DOCUMENT_SESSION]: DocumentSession;
  [IPC_CHANNEL.UPDATE_DOCUMENT_SESSION]: DocumentSession;
  [IPC_CHANNEL.FLUSH_DOCUMENT]: FlushDocumentResponse;
  [IPC_CHANNEL.GET_RECOVERY_DRAFT]: GetRecoveryDraftResponse;
  [IPC_CHANNEL.RECOVER_DRAFT]: DocumentSession;
  [IPC_CHANNEL.DISCARD_RECOVERY_DRAFT]: { success: boolean };
};

export type IpcRequestData<C extends IpcChannel> = IpcRequestMap[C];
export type IpcResponseData<C extends IpcChannel> = IpcResponseMap[C];

type IpcRequest<C extends IpcChannel = IpcChannel> =
  IpcRequestData<C> extends undefined
    ? {
        type: C;
        data?: undefined;
      }
    : {
        type: C;
        data: IpcRequestData<C>;
      };

export type AnyIpcRequest = {
  [C in IpcChannel]: IpcRequest<C>;
}[IpcChannel];

export type IpcResponse<T = unknown> = {
  status: number;
  data: T;
  message?: string;
};

export const IPC_CHANNELS = Object.values(IPC_CHANNEL) as IpcChannel[];
