// ============================================================
// For ipc channle constant, renderer to main process
// ============================================================
export const SERVER_CHANNEL = {
  addLibOrFile: 'server-add-lib-or-file',
  delLibOrFile: 'server-del-lib-or-file',
  readConfig: 'server-read-config',
  getLibrary: 'server-get-library',
  queryFile: 'searver-query-file'
};

export const APP_PROMOT = '[nwriter]:';

// The IoC version
export const IPC_CHANNEL = {
  READ_CONFIG: 'read-config',
  READ_FILE: 'read-file',
  UPDATE_LIB: 'update-lib',
  WIRTE_FILE: 'write-file',
  RUNTIME: 'runtime' // 运行时配置
};
