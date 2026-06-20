import nodePath from 'path';
import { inject, injectable } from 'inversify';
import { CONFIG_DIR_NAME, LOG_DIR_NAME, LOG_NAME, ROOT_CONFIG_NAME, ROOT_DIR_NAME } from 'src/config/env';
import { isTrulyEmpty } from 'src/tools/utils';
import IConfigService from '../interface/config-service';
import IFileSystem from '../interface/file-system';
import IRuntimeConfigStore from '../interface/runtime-config-store';
import IWorkspaceService from '../interface/workspace-service';
import { TYPES } from '../types';

@injectable()
class WorkspaceService implements IWorkspaceService {
  constructor(
    @inject(TYPES.IFileSystem) private fileSystem: IFileSystem,
    @inject(TYPES.IRuntimeConfigStore) private store: IRuntimeConfigStore,
    @inject(TYPES.IConfigService) private configService: IConfigService
  ) {}

  async initWorkspace(): Promise<void> {
    const home = process.env.HOME || process.env.USERPROFILE;
    if (isTrulyEmpty(home)) {
      throw new Error('[nwriter] Cannot resolve user home path.');
    }

    const macConfigDir = nodePath.join(home, '.config', CONFIG_DIR_NAME);
    const macLogDir = nodePath.join(home, '.local', 'state', LOG_DIR_NAME);
    const macLibraryDir = nodePath.join(home, 'documents', ROOT_DIR_NAME);
    const winConfigDir = nodePath.join(home, CONFIG_DIR_NAME);
    const winLogDir = nodePath.join(home, LOG_DIR_NAME, 'log');
    const winLibraryDir = nodePath.join(home, 'documents', ROOT_DIR_NAME);
    const configDir = process.platform === 'win32' ? winConfigDir : macConfigDir;
    const logDir = process.platform === 'win32' ? winLogDir : macLogDir;
    const rootDir = process.platform === 'win32' ? winLibraryDir : macLibraryDir;

    await this.fileSystem.ensureDir(configDir);
    await this.fileSystem.ensureDir(logDir);
    this.store.setConfigs({ logDir, rootDir, configDir });

    const logPath = nodePath.join(logDir, LOG_NAME);
    if (!(await this.fileSystem.exists(logPath))) {
      await this.fileSystem.writeFile(logPath, '');
    }

    await this.configService.initConfig();

    const realRoot = this.store.getConfig('rootDir');
    if (isTrulyEmpty(realRoot)) {
      throw new Error('[nwriter] The workstation path is empty when initWorkspace');
    }

    await this.fileSystem.ensureDir(realRoot);

    const recordPath = nodePath.resolve(realRoot, ROOT_CONFIG_NAME);
    let buffer = JSON.stringify({ children: [] });

    if (await this.fileSystem.exists(recordPath)) {
      buffer = await this.fileSystem.readFile(recordPath, { encoding: 'utf8' });
    }

    this.store.setConfig('libraryTree', JSON.parse(buffer));
  }
}

export default WorkspaceService;
