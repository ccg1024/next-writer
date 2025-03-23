import { IPC_CHANNEL, SERVER_CHANNEL } from 'src/tools/config';
import { IAddLibOrFile, IDelLibOrFile } from 'src/types/api';
import { ReadConfigResponse, ReadFileRequest, ReadFileResponse } from '_types';
import api from '../api';

async function addLibOrFile(data: IAddLibOrFile) {
  return api({ type: SERVER_CHANNEL.addLibOrFile, data });
}

async function delLibOrFile(data: IDelLibOrFile) {
  return api({ type: SERVER_CHANNEL.delLibOrFile, data });
}

async function readConfig() {
  return api<undefined, ReadConfigResponse>({ type: IPC_CHANNEL.READ_CONFIG });
}

async function getLibrary() {
  return api({ type: SERVER_CHANNEL.getLibrary, data: null });
}

async function readFile(data: ReadFileRequest) {
  return api<ReadFileRequest, ReadFileResponse>({ type: IPC_CHANNEL.READ_FILE, data });
}

const mainProcess = { addLibOrFile, delLibOrFile, readConfig, getLibrary, readFile };

export default mainProcess;
