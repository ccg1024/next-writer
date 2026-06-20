import { app, BrowserWindow } from 'electron';
import { inject, injectable, multiInject } from 'inversify';
import IApplication from '../interface/application';
import IGlobalErrorReporter from '../interface/global-error-reporter';
import IIpcHandler from '../interface/ipc-handler';
import IIpcRouter from '../interface/ipc-router';
import IProtocolService from '../interface/protocol-service';
import IWindowSessionCoordinator from '../interface/window-session-coordinator';
import { TYPES } from '../types';

@injectable()
class Application implements IApplication {
  constructor(
    @inject(TYPES.IWindowSessionCoordinator) private windowSessionCoordinator: IWindowSessionCoordinator,
    @inject(TYPES.IIpcRouter) private ipcRouter: IIpcRouter,
    @multiInject(TYPES.IIpcHandler) private ipcHandlers: IIpcHandler[],
    @inject(TYPES.IProtocolService) private protocolService: IProtocolService,
    @inject(TYPES.IGlobalErrorReporter) private globalErrorReporter: IGlobalErrorReporter
  ) {}

  async start(): Promise<void> {
    await app.whenReady();

    this.globalErrorReporter.listen();
    this.protocolService.handleProtocols();
    this.ipcRouter.listen();
    this.ipcHandlers.forEach(handler => this.ipcRouter.registerHandler(handler));
    await this.windowSessionCoordinator.createWindow();

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.windowSessionCoordinator.createWindow();
      }
    });
  }
}

export default Application;
