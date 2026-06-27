import nodePath from 'path';
import { inject, injectable } from 'inversify';
import { CONFIG_DIR_NAME, LOG_DIR_NAME, LOG_NAME, ROOT_CONFIG_NAME, ROOT_DIR_NAME } from 'src/config/env';
import { isTrulyEmpty } from 'src/tools/utils';
import IAppPathStore from '../interface/app-path-store';
import IConfigService from '../interface/config-service';
import IFileSystem from '../interface/file-system';
import ILibraryTreeStore from '../interface/library-tree-store';
import IWorkspaceService from '../interface/workspace-service';
import { normalizeLibraryTree, persistLibTree } from '../utils/lib-tree-utils';
import { TYPES } from '../types';

@injectable()
class WorkspaceService implements IWorkspaceService {
  constructor(
    @inject(TYPES.IFileSystem) private fileSystem: IFileSystem,
    @inject(TYPES.IAppPathStore) private appPathStore: IAppPathStore,
    @inject(TYPES.ILibraryTreeStore) private libraryTreeStore: ILibraryTreeStore,
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
    this.appPathStore.setPaths({ logDir, rootDir, configDir });

    const logPath = nodePath.join(logDir, LOG_NAME);
    if (!(await this.fileSystem.exists(logPath))) {
      await this.fileSystem.writeFile(logPath, '');
    }

    await this.configService.initConfig();

    const realRoot = this.appPathStore.getRootDir();
    if (isTrulyEmpty(realRoot)) {
      throw new Error('[nwriter] The workstation path is empty when initWorkspace');
    }

    await this.fileSystem.ensureDir(realRoot);

    const recordPath = nodePath.resolve(realRoot, ROOT_CONFIG_NAME);
    let buffer = JSON.stringify({ children: [] });
    const recordExists = await this.fileSystem.exists(recordPath);

    if (recordExists) {
      buffer = await this.fileSystem.readFile(recordPath, { encoding: 'utf8' });
    }

    const migration = normalizeLibraryTree(JSON.parse(buffer));
    this.libraryTreeStore.setTree(migration.tree);

    if (!recordExists || migration.migrated) {
      await persistLibTree(migration.tree, realRoot, this.fileSystem);
    }
  }
}

export default WorkspaceService;
