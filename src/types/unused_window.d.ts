// NOTE: duplicate
import type { BrowserWindow } from 'electron'
import { RootWorkstationInfo } from '_common_type'

declare module '_window_type' {
  export type WindowConfig = {
    win: BrowserWindow
    workPlatform: string // current open file location
    root: string // Library file path
    configPath: string
    logPath: string
    configName: 'nwriter.json'
    rootWorkplatformInfo: RootWorkstationInfo
    renderConfig: { [key: string]: string | number | boolean }
    menuStatus: MenuStatus
  }
  export type Cache = {
    [key: string]: CacheContent
  }
  export type CacheContent = {
    isChange: boolean
    content: string
  }
  export type UpdateCacheContent = {
    filePath: string
  } & Partial<CacheContent>

  export type MenuStatus = {
    sideBarVisble: boolean
  }
}

// declare global {
//   namespace globalThis {
//     /* eslint-disable no-var */
//     var _next_writer_windowConfig: WindowConfig
//   }
// }
