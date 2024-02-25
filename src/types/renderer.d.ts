import { IpcRendererEvent } from 'electron'

type CallbackFunction = (event: IpcRendererEvent, ...args: unknown[]) => void

export interface ipc {
  listenEditorChannel: (cb: CallbackFunction) => () => void
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
}
