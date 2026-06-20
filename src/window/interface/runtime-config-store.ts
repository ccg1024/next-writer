import { MainProcessConfig } from '_types';

interface StoreSystem<T> {
  init(config: T): void;

  setConfig<K extends keyof T>(key: K, value: T[K]): void;

  getConfig<K extends keyof T>(key: K, raw?: boolean): T[K];

  setConfigs(config: Partial<T>): void;

  getConfigs(): T;

  destroy(): void;
}

type IRuntimeConfigStore = StoreSystem<MainProcessConfig>;

export default IRuntimeConfigStore;
