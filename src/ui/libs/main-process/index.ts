import { SERVER_CHANNEL } from 'src/tools/config';
import { IAddLibOrFile, IDelLibOrFile, QueryFileDTO } from 'src/types/api';
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

async function queryFile(data: QueryFileDTO) {
  return api({ type: SERVER_CHANNEL.queryFile, data });
}

const mainProcess = { addLibOrFile, delLibOrFile, readConfig, getLibrary, queryFile };

export default mainProcess;
