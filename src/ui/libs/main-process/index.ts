import { IPC_CHANNEL } from 'src/tools/config';
import { ReadConfigResponse, ReadFileRequest, ReadFileResponse, UpdateLibRequest, UpdateLibResponse } from '_types';
import api from '../api';

async function readConfig() {
  return api<undefined, ReadConfigResponse>({ type: IPC_CHANNEL.READ_CONFIG });
}

async function readFile(data: ReadFileRequest) {
  return api<ReadFileRequest, ReadFileResponse>({ type: IPC_CHANNEL.READ_FILE, data });
}

async function updateLib(data: UpdateLibRequest) {
  return api<UpdateLibRequest, UpdateLibResponse>({ type: IPC_CHANNEL.UPDATE_LIB, data });
}

const mainProcess = { readConfig, readFile, updateLib };

export default mainProcess;
