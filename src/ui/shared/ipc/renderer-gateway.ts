import {
  ApplyThemeRequest,
  GetDocumentSessionRequest,
  ReadFileRequest,
  UpdateCacheRequest,
  UpdateDocumentSessionRequest,
  UpdateLibRequest,
  WriteFileRequest
} from '_types';

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

async function getDocumentSession(data: GetDocumentSessionRequest) {
  return window.ipc.getDocumentSession(data);
}

async function updateDocumentSession(data: UpdateDocumentSessionRequest) {
  return window.ipc.updateDocumentSession(data);
}

const rendererGateway = {
  readConfig,
  listThemes,
  applyTheme,
  readFile,
  updateLib,
  writeFile,
  queryRuntimeConfig,
  updateCache,
  getDocumentSession,
  updateDocumentSession
};

export default rendererGateway;
