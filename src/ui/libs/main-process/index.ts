import { SERVER_CHANNEL } from 'src/tools/config';
import { NormalObject } from '_types';
import api from '../api';

async function addLibOrFile(data: NormalObject) {
  return api({ type: SERVER_CHANNEL.addLibOrFile, data });
}

async function delLibOrFile(data: NormalObject) {
  return api({ type: SERVER_CHANNEL.delLibOrFile, data });
}

async function readConfig() {
  return api({ type: SERVER_CHANNEL.readConfig, data: null });
}

async function getLibrary() {
  return api({ type: SERVER_CHANNEL.getLibrary, data: null });
}

export { addLibOrFile, delLibOrFile, readConfig, getLibrary };
