import {
  ApplyThemeRequest,
  FlushDocumentRequest,
  GetDocumentSessionRequest,
  ReadFileRequest,
  UpdateCacheRequest,
  UpdateDocumentSessionRequest,
  UpdateLibRequest,
  WriteFileRequest
} from '_types';

/**
 * 渲染进程访问主进程能力的唯一网关；页面组件不直接依赖 preload 暴露的 window.ipc。
 */
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

async function flushDocument(data: FlushDocumentRequest) {
  return window.ipc.flushDocument(data);
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
  updateDocumentSession,
  flushDocument
};

export default rendererGateway;
