import type { BrowserWindow } from 'electron'

declare module '_window_type' {
  export type WindowConfig = {
    win: BrowserWindow
    workPlatform: string // current open file location
    root: string // Library file path
  }
}

declare global {
  namespace globalThis {
    /* eslint-disable no-var */
    var _next_writer_windowConfig: WindowConfig
  }
}
