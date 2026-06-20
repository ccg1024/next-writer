interface IAppPathStore {
  setPaths(paths: { rootDir?: string; configDir?: string; logDir?: string }): void;
  setRootDir(rootDir: string): void;
  getRootDir(): string;
  getConfigDir(): string;
  getLogDir(): string;
}

export default IAppPathStore;
