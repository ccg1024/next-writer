import { injectable } from 'inversify';
import IAppPathStore from '../interface/app-path-store';

@injectable()
class AppPathStore implements IAppPathStore {
  private rootDir = '';
  private configDir = '';
  private logDir = '';

  setPaths(paths: { rootDir?: string; configDir?: string; logDir?: string }): void {
    this.rootDir = paths.rootDir ?? this.rootDir;
    this.configDir = paths.configDir ?? this.configDir;
    this.logDir = paths.logDir ?? this.logDir;
  }

  setRootDir(rootDir: string): void {
    this.rootDir = rootDir;
  }

  getRootDir(): string {
    return this.rootDir;
  }

  getConfigDir(): string {
    return this.configDir;
  }

  getLogDir(): string {
    return this.logDir;
  }
}

export default AppPathStore;
