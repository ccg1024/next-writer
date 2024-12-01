import { Container } from 'inversify';
import NextCahce from '../entities/cache.entity';
import NextFileSystem from '../entities/file-system-entity';
import NextIpcServer from '../entities/ipc-server-entity';
import NextMainGlobal from '../entities/main-global-entity';
import NextWriterMenu from '../entities/menu-entity';
import NextSysInit from '../entities/sys-init-entity';
import CacheSystem from '../interface/cache';
import FileSystem from '../interface/file-system';
import IpcServer from '../interface/ipc-server';
import MainGlobal from '../interface/main-global';
import INextWriterMenu from '../interface/menu';
import SysInit from '../interface/sys-init';
import { TYPES } from '../types';

/**
 * Inversify js container for next writer application
 */
const nextWriterC = new Container();

nextWriterC.bind<MainGlobal>(TYPES.MainGlobal).to(NextMainGlobal);
nextWriterC.bind<FileSystem>(TYPES.FileSystem).to(NextFileSystem);
nextWriterC.bind<SysInit>(TYPES.SysInit).to(NextSysInit);
nextWriterC.bind<IpcServer>(TYPES.IpcServer).to(NextIpcServer);
nextWriterC.bind<CacheSystem>(TYPES.CacheSystem).to(NextCahce);
nextWriterC.bind<INextWriterMenu>(TYPES.INextWriterMenu).to(NextWriterMenu);

export { nextWriterC };
