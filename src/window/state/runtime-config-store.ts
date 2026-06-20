import { injectable } from 'inversify';
import { isTrulyEmpty } from 'src/tools/utils';
import { MainProcessConfig } from '_types';
import IRuntimeConfigStore from '../interface/runtime-config-store';

@injectable()
class RuntimeConfigStore implements IRuntimeConfigStore {
  private __config: MainProcessConfig;

  constructor() {
    this.__config = {};
  }

  init(config: MainProcessConfig): void {
    this.__config = config;
  }

  setConfig<K extends keyof MainProcessConfig>(key: K, value: MainProcessConfig[K]): void {
    if (isTrulyEmpty(key)) {
      throw new Error('The `key` is empty when invoke `setConfig` of `runtime-config-store`');
    }
    this.__config = { ...this.__config, [key]: value };
  }

  setConfigs(config: Partial<MainProcessConfig>): void {
    this.__config = { ...this.__config, ...(config ?? {}) };
  }

  getConfig<K extends keyof MainProcessConfig>(key: K): MainProcessConfig[K] {
    return this.__config?.[key] ?? void 0;
  }

  getConfigs(): MainProcessConfig {
    return this.__config;
  }

  destroy(): void {
    this.__config = null;
  }
}

export default RuntimeConfigStore;
