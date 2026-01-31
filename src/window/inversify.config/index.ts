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

export { nextWriterC };
