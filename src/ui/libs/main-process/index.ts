import { ReadFileRequest, UpdateLibRequest, UpdateCacheRequest, WriteFileRequest } from '_types';

async function readConfig() {
  return window.ipc.readConfig();
}

async function readFile(data: ReadFileRequest) {
  return window.ipc.readFile(data);
}

async function updateLib(data: UpdateLibRequest) {
  return window.ipc.updateLib(data);
}

/**
 * Save file or rename exist file if the name has changed
 */
async function writeFile(data: WriteFileRequest) {
  return window.ipc.writeFile(data);
}

async function queryRuntimeConfig() {
  return window.ipc.queryRuntimeConfig();
}

async function updateCache(data: UpdateCacheRequest) {
  return window.ipc.updateCache(data);
}

const mainProcess = { readConfig, readFile, updateLib, writeFile, queryRuntimeConfig, updateCache };

export default mainProcess;
