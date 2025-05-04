import 'reflect-metadata'; // need this for inversify js
import { Container } from 'inversify';
// import NextCahce from '../entities/cache.entity';
// import NextFileSystem from '../entities/file-system-entity';
// import NextIpcServer from '../entities/ipc-server-entity';
// import NextMainGlobal from '../entities/main-global-entity';
// import NextWriterMenu from '../entities/menu-entity';
// import NextSysInit from '../entities/sys-init-entity';
// import CacheSystem from '../interface/cache';
// import FileSystem from '../interface/file-system';
// import IpcServer from '../interface/ipc-server';
// import MainGlobal from '../interface/main-global';
// import INextWriterMenu from '../interface/menu';
// import SysInit from '../interface/sys-init';
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

/**
 * Inversify js container for next writer application
 */
const nextWriterC = new Container();

// nextWriterC.bind<MainGlobal>(TYPES.MainGlobal).to(NextMainGlobal);
// nextWriterC.bind<FileSystem>(TYPES.FileSystem).to(NextFileSystem);
// nextWriterC.bind<SysInit>(TYPES.SysInit).to(NextSysInit);
// nextWriterC.bind<IpcServer>(TYPES.IpcServer).to(NextIpcServer);
// nextWriterC.bind<CacheSystem>(TYPES.CacheSystem).to(NextCahce);
// nextWriterC.bind<INextWriterMenu>(TYPES.INextWriterMenu).to(NextWriterMenu);
nextWriterC.bind<INextFileSystem>(TYPES.INextFileSystem).to(NextFileSystem).inSingletonScope();
nextWriterC.bind<INextStoreSystem>(TYPES.INextStoreSystem).to(NextStoreSystem).inSingletonScope();
nextWriterC.bind<INextCacheSystem>(TYPES.INextCacheSystem).to(NextCacheSystem).inSingletonScope();
nextWriterC.bind<INextIpcServer>(TYPES.INextIpcServer).to(NextIpcServer).inSingletonScope();
nextWriterC.bind<INextMenu>(TYPES.INextMenu).to(NextMenu).inSingletonScope();
nextWriterC.bind<INextApp>(TYPES.INextApp).to(NextApp).inSingletonScope();

export { nextWriterC };
