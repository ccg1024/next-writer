import type {
  MainProcessMenuStatus,
  ReadConfigResponse,
  ReadFileRequest,
  ReadFileResponse,
  UpdateCacheRequest,
  UpdateLibRequest,
  UpdateLibResponse,
  WriteFileRequest
} from '_types';

export const IPC_SERVER_NAME = 'next-ipc-server';

export const IPC_CHANNEL = {
  READ_CONFIG: 'read-config',
  READ_FILE: 'read-file',
  UPDATE_LIB: 'update-lib',
  WRITE_FILE: 'write-file',
  /** @deprecated Use WRITE_FILE instead. */
  WIRTE_FILE: 'write-file',
  RUNTIME: 'runtime',
  UPDATE_CACHE: 'update-cache'
} as const;

export type IpcChannel = (typeof IPC_CHANNEL)[keyof typeof IPC_CHANNEL];

export type RuntimeConfigResponse = {
  menuStatus: MainProcessMenuStatus;
};

export type IpcRequestMap = {
  [IPC_CHANNEL.READ_CONFIG]: undefined;
  [IPC_CHANNEL.READ_FILE]: ReadFileRequest;
  [IPC_CHANNEL.UPDATE_LIB]: UpdateLibRequest;
  [IPC_CHANNEL.WRITE_FILE]: WriteFileRequest;
  [IPC_CHANNEL.RUNTIME]: undefined;
  [IPC_CHANNEL.UPDATE_CACHE]: UpdateCacheRequest;
};

export type IpcResponseMap = {
  [IPC_CHANNEL.READ_CONFIG]: ReadConfigResponse;
  [IPC_CHANNEL.READ_FILE]: ReadFileResponse;
  [IPC_CHANNEL.UPDATE_LIB]: UpdateLibResponse | Record<string, never>;
  [IPC_CHANNEL.WRITE_FILE]: null;
  [IPC_CHANNEL.RUNTIME]: RuntimeConfigResponse;
  [IPC_CHANNEL.UPDATE_CACHE]: { success: boolean };
};

export type IpcRequestData<C extends IpcChannel> = IpcRequestMap[C];
export type IpcResponseData<C extends IpcChannel> = IpcResponseMap[C];

export type IpcRequest<C extends IpcChannel = IpcChannel> =
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
