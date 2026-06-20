import 'reflect-metadata'; // need this for inversify js
import { Container } from 'inversify';
import INextFileSystem from '../interface/next-file-system';
import NextFileSystem from '../entities/next-file-system';
import INextStoreSystem from '../interface/next-store-system';
import NextStoreSystem from '../entities/next-store-system';
import INextCacheSystem from '../interface/next-cache-system';
import NextCacheSystem from '../entities/next-cache-system';
import IIpcRouter from '../interface/ipc-router';
import IpcRouter from '../ipc/ipc-router';
import IAppMenu from '../interface/app-menu';
import AppMenu from '../menu/app-menu';
import { TYPES } from '../types';
import IApplication from '../interface/application';
import Application from '../app/application';
import IGlobalErrorReporter from '../interface/global-error-reporter';
import GlobalErrorReporter from '../app/global-error-reporter';
import IMainWindowFactory from '../interface/main-window-factory';
import MainWindowFactory from '../window/main-window-factory';
import IWindowCloseController from '../interface/window-close-controller';
import WindowCloseController from '../window/window-close-controller';
import IWindowCloseService from '../interface/window-close-service';
import WindowCloseService from '../window/window-close-service';
import IWindowRegistry from '../interface/window-registry';
import WindowRegistry from '../window/window-registry';
import IWindowSessionCoordinator from '../interface/window-session-coordinator';
import WindowSessionCoordinator from '../window/window-session-coordinator';
import IProtocolService from '../interface/protocol-service';
import ProtocolService from '../protocol/protocol-service';
import IPathResolver from '../interface/path-resolver';
import PathResolver from '../services/path-resolver';
import IConfigService from '../interface/config-service';
import ConfigService from '../services/config-service';
import IWorkspaceService from '../interface/workspace-service';
import WorkspaceService from '../services/workspace-service';
import ILibraryService from '../interface/library-service';
import LibraryService from '../services/library-service';
import IDocumentService from '../interface/document-service';
import DocumentService from '../services/document-service';
import IMenuActionService from '../interface/menu-action-service';
import MenuActionService from '../menu/menu-action-service';
import ISenderValidator from '../interface/sender-validator';
import SenderValidator from '../ipc/sender-validator';
import IIpcHandler from '../interface/ipc-handler';
import {
  ReadConfigHandler,
  ReadFileHandler,
  RuntimeHandler,
  UpdateCacheHandler,
  UpdateLibHandler,
  WriteFileHandler
} from '../ipc/handlers';

/**
 * Inversify js container for next writer application
 */
const container = new Container();

container.bind<INextFileSystem>(TYPES.INextFileSystem).to(NextFileSystem).inSingletonScope();
container.bind<INextStoreSystem>(TYPES.INextStoreSystem).to(NextStoreSystem).inSingletonScope();
container.bind<INextCacheSystem>(TYPES.INextCacheSystem).to(NextCacheSystem).inSingletonScope();
container.bind<IIpcRouter>(TYPES.IIpcRouter).to(IpcRouter).inSingletonScope();
container.bind<IAppMenu>(TYPES.IAppMenu).to(AppMenu).inSingletonScope();
container.bind<IApplication>(TYPES.IApplication).to(Application).inSingletonScope();
container.bind<IGlobalErrorReporter>(TYPES.IGlobalErrorReporter).to(GlobalErrorReporter).inSingletonScope();
container.bind<IMainWindowFactory>(TYPES.IMainWindowFactory).to(MainWindowFactory).inSingletonScope();
container.bind<IWindowCloseController>(TYPES.IWindowCloseController).to(WindowCloseController).inSingletonScope();
container.bind<IWindowCloseService>(TYPES.IWindowCloseService).to(WindowCloseService).inSingletonScope();
container.bind<IWindowRegistry>(TYPES.IWindowRegistry).to(WindowRegistry).inSingletonScope();
container
  .bind<IWindowSessionCoordinator>(TYPES.IWindowSessionCoordinator)
  .to(WindowSessionCoordinator)
  .inSingletonScope();
container.bind<IProtocolService>(TYPES.IProtocolService).to(ProtocolService).inSingletonScope();
container.bind<IPathResolver>(TYPES.IPathResolver).to(PathResolver).inSingletonScope();
container.bind<IConfigService>(TYPES.IConfigService).to(ConfigService).inSingletonScope();
container.bind<IWorkspaceService>(TYPES.IWorkspaceService).to(WorkspaceService).inSingletonScope();
container.bind<ILibraryService>(TYPES.ILibraryService).to(LibraryService).inSingletonScope();
container.bind<IDocumentService>(TYPES.IDocumentService).to(DocumentService).inSingletonScope();
container.bind<IMenuActionService>(TYPES.IMenuActionService).to(MenuActionService).inSingletonScope();
container.bind<ISenderValidator>(TYPES.ISenderValidator).to(SenderValidator).inSingletonScope();

container.bind<IIpcHandler>(TYPES.IIpcHandler).to(ReadConfigHandler).inSingletonScope();
container.bind<IIpcHandler>(TYPES.IIpcHandler).to(ReadFileHandler).inSingletonScope();
container.bind<IIpcHandler>(TYPES.IIpcHandler).to(UpdateLibHandler).inSingletonScope();
container.bind<IIpcHandler>(TYPES.IIpcHandler).to(WriteFileHandler).inSingletonScope();
container.bind<IIpcHandler>(TYPES.IIpcHandler).to(RuntimeHandler).inSingletonScope();
container.bind<IIpcHandler>(TYPES.IIpcHandler).to(UpdateCacheHandler).inSingletonScope();

export { container };
