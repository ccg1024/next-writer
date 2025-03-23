// This file is to collect ipc event handler, which will be call the `apply` function of target handler for every ipc event
import INextIpcHandler from '../interface/next-ipc-handler';
import readConfigHandler from './read-config-handler';
import readFileHandler from './read-file-handler';
import updateLibHandler from './update-lib-handler';

const ipcHanlders: Array<INextIpcHandler> = [readConfigHandler, readFileHandler, updateLibHandler];

export default ipcHanlders;
