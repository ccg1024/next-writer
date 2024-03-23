import { IpcRendererEvent } from 'electron'
import { IpcRequestData, IpcResponseData } from '_common_type'

type CallbackFunction = (event: IpcRendererEvent, ...args: unknown[]) => void

export interface ipc {
  listenEditorChannel: (cb: CallbackFunction) => () => void
  listenHomeChannel: (cb: CallbackFunction) => () => void
  listenSidebarChannel: (cb: CallbackFunction) => () => void
  // _render_openFile: (filePath: string) => void
  // _render_updateCache: (
  //   cache: Partial<CacheContent> & { filePath: string }
  // ) => void
  // _render_saveFile: (content: string) => void
  // _invoke_get_info: (type: InvokeInfoType) => Promise<unknown>
  _invoke_post: (
    channel: string,
    data: IpcRequestData
  ) => Promise<IpcResponseData>
  _render_post: (
    channel: string,
    data: IpcRequestData
  ) => Promise<IpcResponseData>
}

declare global {
  interface Window {
    ipc: ipc
    _next_writer_rendererConfig: RendererConfig
  }
}

export type RendererPlugin = {
  typewriter?: boolean
}

export type RendererConfig = {
  rendererPlugin: RendererPlugin
  workPath: string
  modified: boolean
}

export type FileStatus = readonly 'modified' | 'normal'

export type PubSubData = {
  type: string
  data: unknown
}

export type RenderNewFileType = {
  pathType: readonly 'file' | 'folder'
  replyChannel: string // 对应组件
  replyType: string // 对应组件内部处理分支
  pathPrefix: string
}

export type RenderNewFileReply = {
  pathType: 'file' | 'folder'
  pathName: string
}

export type HeadNav = {
  title: string
  level: number
  number: number
  jumpPos: number
}
