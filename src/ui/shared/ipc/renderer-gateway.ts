import { ApplyThemeRequest, ReadFileRequest, UpdateCacheRequest, UpdateLibRequest, WriteFileRequest } from '_types';

async function readConfig() {
  return window.ipc.readConfig();
}

async function listThemes() {
  return window.ipc.listThemes();
}

async function applyTheme(data: ApplyThemeRequest) {
  return window.ipc.applyTheme(data);
}

async function readFile(data: ReadFileRequest) {
  return window.ipc.readFile(data);
}

async function updateLib(data: UpdateLibRequest) {
  return window.ipc.updateLib(data);
}

async function writeFile(data: WriteFileRequest) {
  return window.ipc.writeFile(data);
}

async function queryRuntimeConfig() {
  return window.ipc.queryRuntimeConfig();
}

async function updateCache(data: UpdateCacheRequest) {
  return window.ipc.updateCache(data);
}

const rendererGateway = {
  readConfig,
  listThemes,
  applyTheme,
  readFile,
  updateLib,
  writeFile,
  queryRuntimeConfig,
  updateCache
};

export default rendererGateway;
