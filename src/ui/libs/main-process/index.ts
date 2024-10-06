import { SERVER_CHANNEL } from 'src/tools/config';
import { IAddLibOrFile, IDelLibOrFile } from 'src/types/api';
import api from '../api';

async function addLibOrFile(data: IAddLibOrFile) {
  return api({ type: SERVER_CHANNEL.addLibOrFile, data });
}

async function delLibOrFile(data: IDelLibOrFile) {
  return api({ type: SERVER_CHANNEL.delLibOrFile, data });
}

async function readConfig() {
  return api({ type: SERVER_CHANNEL.readConfig, data: null });
}

async function getLibrary() {
  return api({ type: SERVER_CHANNEL.getLibrary, data: null });
}

const mainProcess = { addLibOrFile, delLibOrFile, readConfig, getLibrary };

export default mainProcess;
