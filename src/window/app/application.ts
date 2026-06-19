import { app, BrowserWindow } from 'electron';
import { inject, injectable, multiInject } from 'inversify';
import IApplication from '../interface/application';
import IGlobalErrorReporter from '../interface/global-error-reporter';
import INextApp from '../interface/next-app';
import INextIpcHandler from '../interface/next-ipc-handler';
import INextIpcServer from '../interface/next-ipc-server';
import IProtocolService from '../interface/protocol-service';
import { TYPES } from '../types';

@injectable()
class Application implements IApplication {
  constructor(
    @inject(TYPES.INextApp) private nextApp: INextApp,
    @inject(TYPES.INextIpcServer) private ipcServer: INextIpcServer,
    @multiInject(TYPES.INextIpcHandler) private ipcHandlers: INextIpcHandler[],
    @inject(TYPES.IProtocolService) private protocolService: IProtocolService,
    @inject(TYPES.IGlobalErrorReporter) private globalErrorReporter: IGlobalErrorReporter
  ) {}

  async start(): Promise<void> {
    await app.whenReady();

    this.globalErrorReporter.listen();
    this.protocolService.handleProtocols();
    this.ipcServer.listen();
    this.ipcHandlers.forEach(handler => this.ipcServer.registerHandler(handler));
    await this.nextApp.createWindow();

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.nextApp.createWindow();
      }
    });
  }
}

export default Application;
