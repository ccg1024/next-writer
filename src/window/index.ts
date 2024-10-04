import { app, BrowserWindow, dialog, net, protocol } from 'electron';
import path from 'path';
import nextWriter from './app';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
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
]);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', nextWriter.createWindow);
app.whenReady().then(() => {
  protocol.handle('atom', request => {
    return net.fetch('file://' + decodeURI(request.url.slice('atom://'.length)));
  });
  protocol.handle('static', request => {
    const fileUrl = request.url.slice('static://'.length);
    const filePath = path.join(app.getAppPath(), '.webpack/renderer', fileUrl);
    return net.fetch('file://' + filePath);
  });

  process.on('uncaughtException', err => {
    dialog.showErrorBox('主进程错误', `发生一个未捕获异常: ${err.message}`);
  });
  process.on('unhandledRejection', reason => {
    dialog.showErrorBox('主进程错误', `发生一个未捕获Promise异常: ${reason}`);
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    nextWriter.createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
