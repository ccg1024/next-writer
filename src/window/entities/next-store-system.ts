import { injectable } from 'inversify';
import { isTrulyEmpty } from 'src/tools/utils';
import { MainProcessConfig } from '_types';
import INextStoreSystem from '../interface/next-store-system';

function constObjProxyFactory<T extends object>(target: T, key?: unknown) {
  return new Proxy(target, {
    set() {
      if (!isTrulyEmpty(key)) {
        throw new Error('Cannot modify a constant config directly, using setConfig instead.');
      }
      throw new Error(`Cannot modify a constant config of key(${key}) directly, using setConfig instead.`);
    }
  });
}

@injectable()
class NextStoreSystem implements INextStoreSystem<MainProcessConfig> {
  private __config: MainProcessConfig;

  constructor() {
    this.__config = {};
  }

  init(config: MainProcessConfig): void {
    this.__config = config;
  }

  setConfig<K extends keyof MainProcessConfig>(key: K, value: MainProcessConfig[K]): void {
    if (isTrulyEmpty(key)) {
      throw new Error('The `key` is empty when invoke `setConfig` of `next-store-system`');
    }
    this.__config = { ...this.__config, [key]: value };
  }

  setConfigs(config: Partial<MainProcessConfig>): void {
    this.__config = { ...this.__config, ...(config ?? {}) };
  }

  getConfig<K extends keyof MainProcessConfig>(key: K): MainProcessConfig[K] {
    const target = this.__config?.[key] ?? void 0;
    if (typeof target === 'object' && target !== null) {
      return constObjProxyFactory(target as unknown as object, key) as unknown as MainProcessConfig[K];
    }
    return target;
  }

  getConfigs(): MainProcessConfig {
    return constObjProxyFactory(this.__config);
  }

  destroy(): void {
    this.__config = null;
  }
}

export default NextStoreSystem;
