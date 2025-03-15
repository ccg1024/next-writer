import { CONFIG_DIR_NAME, LOG_DIR_NAME, ROOT_DIR_NAME } from 'bin/index.es.js';
import fs from 'fs';
import path from 'path';
import { normalizeError } from 'src/tools/utils';
import IpcServer from '../ipc/server';
import type FileSystem from './file-system';
import type MainGlobal from './main-global';

// rootDir can also add to config file
const DEFAULT_CONFIG = {
  font: '',
  code: 'monospace',
  fontSize: '16px',
  focusMode: false,
  typewriter: false
};

// Root dir info file
const WORKSPACE_INFO_FILE = '.nwriter.info.json';

/**
 * Initialize the system
 *
 * @dependence FileSystem
 * @dependence MainGlobal
 *
 * @author crazycodegame
 *
 */
class SysInit {
  private _ipcServer: IpcServer;
  private _fileSystem: FileSystem;
  private _mainGlobal: MainGlobal;

  constructor(fileSystem: FileSystem, mainGlobal: MainGlobal, ipcServer: IpcServer) {
    this._fileSystem = fileSystem;
    this._mainGlobal = mainGlobal;
    this._ipcServer = ipcServer;

    this.init = this.init.bind(this);
  }

  /**
   * Try to init system
   */
  init() {
    this.initFileSystem();
    this.initIpc();
  }

  // Init ipc hanlder and listener
  initIpc() {
    this._ipcServer.listen();
  }

  // ============================================================
  // Init file system
  // 1. Generate defautl config file if there are not.
  // 2. Read config file if There are config file.
  // 3. Generate library according to config file.
  //
  // NOTE: Using synchronous code to make sure everything is ok
  // when user can operate the app.
  //
  // ============================================================
  initFileSystem() {
    const { logPath, configPath, root } = this.getDefaultAppDirectorys();
    this._mainGlobal.addConfig({ logDir: logPath, configDir: configPath, rootDir: root });
    this.writeDefaultConfig();
    const configStr = this.readConfigFile();
    const { rootDir: _rootDir, ...restConfig } = JSON.parse(configStr);

    // If there are `rootDir` key in config file, update _mainGlobal.
    if (_rootDir) {
      this._mainGlobal.setConfig('rootDir', _rootDir);
    }

    // If there are some render config, set to main global
    this._mainGlobal.setConfig('renderConfig', { ...DEFAULT_CONFIG, ...restConfig });

    // Generate library if do not exists
    const rootDir = this._mainGlobal.getConfig('rootDir');
    if (!fs.existsSync(rootDir)) {
      fs.mkdirSync(rootDir, { recursive: true });
    }

    // Loading library info file
    this.initLibrary();
  }

  // Get config, log, library path.
  getDefaultAppDirectorys() {
    const home = process.env.HOME || process.env.USERPROFILE;
    const configDir = `${home}/.config/${CONFIG_DIR_NAME}`;
    const logDir = `${home}/.local/state/${LOG_DIR_NAME}`;
    const libraryDir = `${home}/documents/${ROOT_DIR_NAME}`;

    // for windows platform
    const winConfig = `${home}\\${CONFIG_DIR_NAME}`;
    const winLog = `${home}\\${LOG_DIR_NAME}\\log`;
    const winLibrary = `${home}\\documents\\${ROOT_DIR_NAME}`;

    const config = process.platform === 'win32' ? winConfig : configDir;
    const log = process.platform === 'win32' ? winLog : logDir;
    const root = process.platform === 'win32' ? winLibrary : libraryDir;

    if (!fs.existsSync(config)) {
      fs.mkdirSync(config, { recursive: true });
    }

    if (!fs.existsSync(log)) {
      fs.mkdirSync(log, { recursive: true });
    }

    return { configPath: config, logPath: log, root };
  }

  /**
   * If no configuration file exits, the default configuration file is written
   */
  writeDefaultConfig() {
    const configDir = this._mainGlobal.getConfig('configDir');
    const configName = this._mainGlobal.getConfig('configName');

    if (!configName && !configDir) {
      this._fileSystem.showMessageDialog(
        null,
        '[next-writer] Some error occur, cannot got defautl config path and default config name',
        { type: 'error' }
      );
      return;
    }

    const configPath = path.join(configDir, configName);

    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
    }
  }

  /**
   * Read configuration
   */
  readConfigFile() {
    const configDir = this._mainGlobal.getConfig('configDir');
    const configName = this._mainGlobal.getConfig('configName');

    if (!configName || !configDir) {
      this._fileSystem.showMessageDialog(
        null,
        '[next-writer] Some error occur, cannot got default config path and default config name during reading configuration file',
        { type: 'error' }
      );
      return;
    }

    const configPath = path.resolve(configDir, configName);

    if (fs.existsSync(configPath)) {
      return fs.readFileSync(configPath).toString('utf8');
    }
  }

  // Load the workspace configuration file .nwriter.info.json
  initLibrary() {
    // Get root dir path
    const rootDir = this._mainGlobal.getConfig('rootDir');

    if (!rootDir) {
      this.initError('The root dir is empty during loading workspace configuration file');
      return;
    }

    const infoFilePath = path.resolve(rootDir, WORKSPACE_INFO_FILE);

    // If there is no info file, the library is empty or a new one.
    if (!fs.existsSync(infoFilePath)) {
      this._fileSystem.updateLibrary();
      this._fileSystem.setTree([]);
      return;
    }

    // If exists info file, loading...
    const infoBuff = fs.readFileSync(infoFilePath, { encoding: 'utf8' });
    const infoObj = JSON.parse(infoBuff);
    this._fileSystem.setTree(infoObj?.tree);
  }

  private initError(message: string) {
    this._fileSystem.showMessageDialog(null, normalizeError(message), { type: 'error' });
  }
}

export default SysInit;
