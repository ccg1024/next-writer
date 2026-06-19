import nodePath from 'path';
import { inject, injectable } from 'inversify';
import { CONFIG_JSON_NAME, NW_CONFIG } from 'src/config/env';
import { isEffectObject, isTrulyEmpty, removeEmpty } from 'src/tools/utils';
import IConfigService from '../interface/config-service';
import INextFileSystem from '../interface/next-file-system';
import INextStoreSystem from '../interface/next-store-system';
import { TYPES } from '../types';

@injectable()
class ConfigService implements IConfigService {
  constructor(
    @inject(TYPES.INextFileSystem) private fileSystem: INextFileSystem,
    @inject(TYPES.INextStoreSystem) private store: INextStoreSystem
  ) {}

  async initConfig(configFilePath?: string): Promise<void> {
    const defaultConfigDir = this.store.getConfig('configDir') ?? '';

    if (isTrulyEmpty(configFilePath) && isTrulyEmpty(defaultConfigDir)) {
      throw new Error('[nwriter] Get empty path of config json file.');
    }

    const path = isTrulyEmpty(configFilePath) ? nodePath.join(defaultConfigDir, CONFIG_JSON_NAME) : configFilePath;

    if (!(await this.fileSystem.isExist(path))) {
      await this.fileSystem.writeFile(path, JSON.stringify(NW_CONFIG, null, 2));
      this.store.setConfig('renderConfig', NW_CONFIG);
      return;
    }

    const buffer = await this.fileSystem.readFile(path);
    const jsonObj = removeEmpty(JSON.parse(buffer));
    const { root, ...restConfig } = jsonObj;

    if (!isTrulyEmpty(root)) {
      this.store.setConfig('rootDir', root as string);
    }

    if (isEffectObject(restConfig)) {
      this.store.setConfig('renderConfig', restConfig);
    }
  }
}

export default ConfigService;
