/**
 * Initialize the system interface used by inversifyJs
 *
 * @author crazycodegame
 */
interface SysInit {
  init(): void;
  initIpc(): void;
  initFileSystem(): void;
  getDefaultAppDirectorys(): { configPath: string; logPath: string; root: string };
  writeDefaultConfig(): void;
  readConfigFile(): string;
  initLibrary(): void;
  initError(message: string): void;
}

export default SysInit;
