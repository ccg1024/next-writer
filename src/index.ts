import { app, protocol, BrowserWindow, net, Menu } from 'electron'
import { mountIPC } from './window/ipc'
import createMenus from './window/menu/menu'
import { hasModifiedFile, initCacheAccessor } from './window/cache'
import { getDefaultAppDirectory } from './window/utils'
import {
  initialRootWorkplatform,
  readConfig,
  readRootWorkstationInfo
} from './window/file_process'
import { alertInfo } from './window/dialog'
import { handleLeavFullScreen } from './window/windowListen'
import path from 'path'
// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Webpack
// plugin that tells the Electron app where to look for the Webpack-bundled app code (depending on
// whether you're running in development or production).
declare const MAIN_WINDOW_WEBPACK_ENTRY: string
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

const { config, log } = getDefaultAppDirectory()

global._next_writer_windowConfig = {
  win: null,
  workPlatform: '',
  root: '',
  configPath: config,
  logPath: log,
  configName: 'nwriter.json',
  rootWorkplatformInfo: { folders: [], files: [] },
  renderConfig: {},
  menuStatus: {
    sideBarVisible: true
  }
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'atom',
    privileges: {
      bypassCSP: true,
      stream: true,
      supportFetchAPI: true,
      corsEnabled: true,
      allowServiceWorkers: true,
      secure: true
    }
  }
])

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 725,
    width: 1180,
    minWidth: 500,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,
      contextIsolation: true
    }
  })

  // read default config
  const configContent = readConfig(config + '/nwriter.json')
  const { root, ...rendererConfig } = configContent

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
  global._next_writer_windowConfig.workPlatform = ''
  global._next_writer_windowConfig.root = root
  global._next_writer_windowConfig.win = mainWindow
  global._next_writer_windowConfig.renderConfig = rendererConfig
  global._next_writer_windowConfig.menuStatus = {
    sideBarVisible: true
  }
  initialRootWorkplatform()

  // create menu
  const menuTemp = createMenus()
  const menu = Menu.buildFromTemplate(menuTemp)
  Menu.setApplicationMenu(menu)

  // init cache accessor
  initCacheAccessor()

  // initialRootWorkplatform
  readRootWorkstationInfo()

  // add some window listen
  mainWindow.on('leave-full-screen', handleLeavFullScreen)

  mainWindow.on('close', e => {
    if (hasModifiedFile()) {
      const stopClose = alertInfo(
        'There are files that have not been saved. Confirm to close?',
        mainWindow
      )
      if (stopClose) {
        e.preventDefault()
        return
      }
    }
    mainWindow.off('leave-full-screen', handleLeavFullScreen)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)
app.whenReady().then(() => {
  // protocol.registerFileProtocol('atom', (request, callback) => {
  //   const url = request.url.substring(7)
  //   callback(decodeURI(path.normalize(url)))
  // })
  protocol.handle('atom', request => {
    return net.fetch('file://' + decodeURI(request.url.slice('atom://'.length)))
  })
  protocol.handle('static', request => {
    const fileUrl = request.url.slice('static://'.length)
    const filePath = path.join(app.getAppPath(), '.webpack/renderer', fileUrl)
    return net.fetch('file://' + filePath)
  })

  // mount ipc
  mountIPC()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
