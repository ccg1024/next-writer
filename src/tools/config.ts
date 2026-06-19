export const APP_PROMOT = '[nwriter]:';

// The IoC version
export const IPC_CHANNEL = {
  READ_CONFIG: 'read-config',
  READ_FILE: 'read-file',
  UPDATE_LIB: 'update-lib',
  WRITE_FILE: 'write-file',
  /** @deprecated Use WRITE_FILE instead. */
  WIRTE_FILE: 'write-file',
  RUNTIME: 'runtime', // 运行时配置
  UPDATE_CACHE: 'update-cache'
};
