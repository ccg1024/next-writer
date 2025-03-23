import nodePath from 'path';
import { IPC_CHANNEL } from 'src/tools/config';
import { QueryFileDTO } from 'src/types/api';
import { MainProcessConfig } from '_types';
import INextFileSystem from '../interface/next-file-system';
import INextIpcHandler from '../interface/next-ipc-handler';
import INextStoreSystem from '../interface/next-store-system';
import { nextWriterC } from '../inversify.config';
import { TYPES } from '../types';

/**
 * Reading the specified file information
 */
const readFileHandler: INextIpcHandler = {
  type: IPC_CHANNEL.READ_FILE,
  apply: async (_: string, data: QueryFileDTO) => {
    const { path } = data || {};
    const store = nextWriterC.get<INextStoreSystem<MainProcessConfig>>(TYPES.INextStoreSystem);
    const fileSys = nextWriterC.get<INextFileSystem>(TYPES.INextFileSystem);
    const rootDir = store.getConfig('rootDir');
    const fullPath = path.startsWith(rootDir) ? path : nodePath.join(rootDir, path);
    const content = await fileSys.readFile(fullPath, { encoding: 'utf8' });
    return { status: 0, data: { content }, message: '' };
  }
};

Object.setPrototypeOf(readFileHandler, null);

export default readFileHandler;
