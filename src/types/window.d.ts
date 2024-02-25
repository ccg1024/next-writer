import type { BrowserWindow } from 'electron'

declare module '_window_type' {
  export type WindowConfig = {
    win: BrowserWindow
  }
}

declare global {
  namespace globalThis {
    /* eslint-disable no-var */
    var _next_writer_windowConfig: WindowConfig
  }
}
