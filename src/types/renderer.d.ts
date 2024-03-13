import { IpcRendererEvent } from 'electron'
import { CacheContent } from '_window_type'

type CallbackFunction = (event: IpcRendererEvent, ...args: unknown[]) => void

export interface ipc {
  listenEditorChannel: (cb: CallbackFunction) => () => void
  listenHomeChannel: (cb: CallbackFunction) => () => void
  listenSidebarChannel: (cb: CallbackFunction) => () => void
  _render_openFile: (filePath: string) => void
  _render_updateCache: (
    cache: Partial<CacheContent> & { filePath: string }
  ) => void
  _render_saveFile: (content: string) => void
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
