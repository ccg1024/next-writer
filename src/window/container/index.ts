import 'reflect-metadata'; // need this for inversify js
import { Container } from 'inversify';
import IFileSystem from '../interface/file-system';
import FileSystem from '../infrastructure/file-system';
import IAppPathStore from '../interface/app-path-store';
import AppPathStore from '../state/app-path-store';
import IRenderConfigStore from '../interface/render-config-store';
import RenderConfigStore from '../state/render-config-store';
import ILibraryTreeStore from '../interface/library-tree-store';
import LibraryTreeStore from '../state/library-tree-store';
import IMenuStateStore from '../interface/menu-state-store';
import MenuStateStore from '../state/menu-state-store';
import IDocumentCacheService from '../interface/document-cache-service';
import DocumentCacheService from '../domain/document-cache-service';
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
import PathResolver from '../infrastructure/path-resolver';
import IConfigService from '../interface/config-service';
import ConfigService from '../domain/config-service';
import IWorkspaceService from '../interface/workspace-service';
import WorkspaceService from '../domain/workspace-service';
import ILibraryService from '../interface/library-service';
import LibraryService from '../domain/library-service';
import IDocumentService from '../interface/document-service';
import DocumentService from '../domain/document-service';
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

container.bind<IFileSystem>(TYPES.IFileSystem).to(FileSystem).inSingletonScope();
container.bind<IAppPathStore>(TYPES.IAppPathStore).to(AppPathStore).inSingletonScope();
container.bind<IRenderConfigStore>(TYPES.IRenderConfigStore).to(RenderConfigStore).inSingletonScope();
container.bind<ILibraryTreeStore>(TYPES.ILibraryTreeStore).to(LibraryTreeStore).inSingletonScope();
container.bind<IMenuStateStore>(TYPES.IMenuStateStore).to(MenuStateStore).inSingletonScope();
container.bind<IDocumentCacheService>(TYPES.IDocumentCacheService).to(DocumentCacheService).inSingletonScope();
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
