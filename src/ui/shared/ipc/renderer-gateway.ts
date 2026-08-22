import {
  ApplyThemeRequest,
  DiscardRecoveryDraftRequest,
  FlushDocumentRequest,
  GetDocumentSessionRequest,
  GetRecoveryDraftRequest,
  ReadFileRequest,
  RecoverDraftRequest,
  ResolveDocumentConflictRequest,
  SaveDocumentCopyRequest,
  UpdateCacheRequest,
  UpdateDocumentSessionRequest,
  UpdateLibRequest,
  UpdateWorkspaceMetadataRequest,
  WriteFileRequest,
  WorkspaceSearchRequest
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

async function getRecoveryDraft(data: GetRecoveryDraftRequest) {
  return window.ipc.getRecoveryDraft(data);
}

async function recoverDraft(data: RecoverDraftRequest) {
  return window.ipc.recoverDraft(data);
}

async function discardRecoveryDraft(data: DiscardRecoveryDraftRequest) {
  return window.ipc.discardRecoveryDraft(data);
}

async function resolveDocumentConflict(data: ResolveDocumentConflictRequest) {
  return window.ipc.resolveDocumentConflict(data);
}

async function saveDocumentCopy(data: SaveDocumentCopyRequest) {
  return window.ipc.saveDocumentCopy(data);
}

async function searchWorkspace(data: WorkspaceSearchRequest) {
  return window.ipc.searchWorkspace(data);
}

async function getWorkspaceMetadata() {
  return window.ipc.getWorkspaceMetadata();
}

async function updateWorkspaceMetadata(data: UpdateWorkspaceMetadataRequest) {
  return window.ipc.updateWorkspaceMetadata(data);
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
  flushDocument,
  getRecoveryDraft,
  recoverDraft,
  discardRecoveryDraft,
  resolveDocumentConflict,
  saveDocumentCopy,
  searchWorkspace,
  getWorkspaceMetadata,
  updateWorkspaceMetadata
};

export default rendererGateway;
