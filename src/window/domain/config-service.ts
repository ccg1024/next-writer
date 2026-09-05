import nodePath from 'path';
import { inject, injectable } from 'inversify';
import { CONFIG_JSON_NAME, NW_CONFIG } from 'src/config/env';
import { isEffectObject, isTrulyEmpty, removeEmpty } from 'src/tools/utils';
import type { NormalObject } from '_types';
import IAppPathStore from '../interface/app-path-store';
import IConfigService from '../interface/config-service';
import IFileSystem from '../interface/file-system';
import IRenderConfigStore from '../interface/render-config-store';
import { TYPES } from '../types';

@injectable()
class ConfigService implements IConfigService {
  private updateQueue: Promise<unknown> = Promise.resolve();
  constructor(
    @inject(TYPES.IFileSystem) private fileSystem: IFileSystem,
    @inject(TYPES.IAppPathStore) private appPathStore: IAppPathStore,
    @inject(TYPES.IRenderConfigStore) private renderConfigStore: IRenderConfigStore
  ) {}

  async initConfig(configFilePath?: string): Promise<void> {
    const defaultConfigDir = this.appPathStore.getConfigDir() ?? '';

    if (isTrulyEmpty(configFilePath) && isTrulyEmpty(defaultConfigDir)) {
      throw new Error('[nwriter] Get empty path of config json file.');
    }

    const path = isTrulyEmpty(configFilePath) ? nodePath.join(defaultConfigDir, CONFIG_JSON_NAME) : configFilePath;

    if (!(await this.fileSystem.exists(path))) {
      await this.fileSystem.writeFile(path, JSON.stringify(NW_CONFIG, null, 2));
      this.renderConfigStore.setConfig(NW_CONFIG);
      return;
    }

    const buffer = await this.fileSystem.readFile(path);
    const jsonObj = removeEmpty(JSON.parse(buffer));
    const { root, ...restConfig } = jsonObj;

    if (!isTrulyEmpty(root)) {
      this.appPathStore.setRootDir(root as string);
    }

    if (isEffectObject(restConfig)) {
      this.renderConfigStore.setConfig(restConfig);
    }
  }

  patchConfig(patch: NormalObject): Promise<NormalObject> {
    const update = this.updateQueue.then(async () => {
      const configFilePath = this.getConfigFilePath();
      const current = await this.readConfig(configFilePath);
      const next = mergeConfig(current, patch);
      await this.fileSystem.writeFile(configFilePath, JSON.stringify(next, null, 2));
      const { root: _root, ...renderConfig } = next;
      this.renderConfigStore.setConfig(renderConfig as NormalObject);
      return next as NormalObject;
    });
    this.updateQueue = update.catch(() => undefined);
    return update;
  }

  private getConfigFilePath(): string {
    return nodePath.join(this.appPathStore.getConfigDir(), CONFIG_JSON_NAME);
  }

  private async readConfig(path: string): Promise<Record<string, unknown>> {
    if (!(await this.fileSystem.exists(path))) return {};
    const value = JSON.parse(await this.fileSystem.readFile(path));
    return isEffectObject(value) ? value : {};
  }
}

function mergeConfig(current: Record<string, unknown>, patch: NormalObject): Record<string, unknown> {
  const next: Record<string, unknown> = { ...current };
  Object.entries(patch).forEach(([key, value]) => {
    const previous = current[key];
    next[key] =
      isEffectObject(previous) && isEffectObject(value)
        ? { ...(previous as Record<string, unknown>), ...(value as Record<string, unknown>) }
        : value;
  });
  return next;
}

export default ConfigService;
