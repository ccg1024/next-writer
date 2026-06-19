import 'reflect-metadata'; // need this for inversify js
import { Container } from 'inversify';
import INextFileSystem from '../interface/next-file-system';
import NextFileSystem from '../entities/next-file-system';
import INextStoreSystem from '../interface/next-store-system';
import NextStoreSystem from '../entities/next-store-system';
import INextCacheSystem from '../interface/next-cache-system';
import NextCacheSystem from '../entities/next-cache-system';
import INextIpcServer from '../interface/next-ipc-server';
import NextIpcServer from '../entities/next-ipc-server';
import INextMenu from '../interface/next-menu';
import NextMenu from '../entities/next-menu';
import INextApp from '../interface/next-app';
import NextApp from '../entities/next-app';
import { TYPES } from '../types';
import IApplication from '../interface/application';
import Application from '../app/application';
import IGlobalErrorReporter from '../interface/global-error-reporter';
import GlobalErrorReporter from '../app/global-error-reporter';
import IMainWindowFactory from '../interface/main-window-factory';
import MainWindowFactory from '../window/main-window-factory';
import IWindowRegistry from '../interface/window-registry';
import WindowRegistry from '../window/window-registry';
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
import INextIpcHandler from '../interface/next-ipc-handler';
import {
  ReadConfigHandler,
  ReadFileHandler,
  RuntimeHandler,
  UpdateCacheHandler,
  UpdateLibHandler,
  WriteFileHandler
} from '../ipc-handler';

/**
 * Inversify js container for next writer application
 */
const nextWriterC = new Container();

nextWriterC.bind<INextFileSystem>(TYPES.INextFileSystem).to(NextFileSystem).inSingletonScope();
nextWriterC.bind<INextStoreSystem>(TYPES.INextStoreSystem).to(NextStoreSystem).inSingletonScope();
nextWriterC.bind<INextCacheSystem>(TYPES.INextCacheSystem).to(NextCacheSystem).inSingletonScope();
nextWriterC.bind<INextIpcServer>(TYPES.INextIpcServer).to(NextIpcServer).inSingletonScope();
nextWriterC.bind<INextMenu>(TYPES.INextMenu).to(NextMenu).inSingletonScope();
nextWriterC.bind<INextApp>(TYPES.INextApp).to(NextApp).inSingletonScope();
nextWriterC.bind<IApplication>(TYPES.IApplication).to(Application).inSingletonScope();
nextWriterC.bind<IGlobalErrorReporter>(TYPES.IGlobalErrorReporter).to(GlobalErrorReporter).inSingletonScope();
nextWriterC.bind<IMainWindowFactory>(TYPES.IMainWindowFactory).to(MainWindowFactory).inSingletonScope();
nextWriterC.bind<IWindowRegistry>(TYPES.IWindowRegistry).to(WindowRegistry).inSingletonScope();
nextWriterC.bind<IProtocolService>(TYPES.IProtocolService).to(ProtocolService).inSingletonScope();
nextWriterC.bind<IPathResolver>(TYPES.IPathResolver).to(PathResolver).inSingletonScope();
nextWriterC.bind<IConfigService>(TYPES.IConfigService).to(ConfigService).inSingletonScope();
nextWriterC.bind<IWorkspaceService>(TYPES.IWorkspaceService).to(WorkspaceService).inSingletonScope();
nextWriterC.bind<ILibraryService>(TYPES.ILibraryService).to(LibraryService).inSingletonScope();
nextWriterC.bind<IDocumentService>(TYPES.IDocumentService).to(DocumentService).inSingletonScope();
nextWriterC.bind<IMenuActionService>(TYPES.IMenuActionService).to(MenuActionService).inSingletonScope();

nextWriterC.bind<INextIpcHandler>(TYPES.INextIpcHandler).to(ReadConfigHandler).inSingletonScope();
nextWriterC.bind<INextIpcHandler>(TYPES.INextIpcHandler).to(ReadFileHandler).inSingletonScope();
nextWriterC.bind<INextIpcHandler>(TYPES.INextIpcHandler).to(UpdateLibHandler).inSingletonScope();
nextWriterC.bind<INextIpcHandler>(TYPES.INextIpcHandler).to(WriteFileHandler).inSingletonScope();
nextWriterC.bind<INextIpcHandler>(TYPES.INextIpcHandler).to(RuntimeHandler).inSingletonScope();
nextWriterC.bind<INextIpcHandler>(TYPES.INextIpcHandler).to(UpdateCacheHandler).inSingletonScope();

export { nextWriterC };
