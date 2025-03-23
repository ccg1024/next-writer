import { MainProcessConfig } from '_types';

/**
 * A store systemt interface whice just provide access to shared information.
 *
 * @author crazycodegame
 */
interface INextStoreSystem<T> {
  /**
   * Initialize store
   */
  init(config: T): void;

  /**
   * Set specific key-value parirs
   */
  setConfig<K extends keyof T>(key: K, value: T[K]): void;

  /**
   * Get specific value of key
   * @param key target `key` of store object
   * @param raw whether return raw data of target, default is `false`
   * @return A proxy of target value if target is object when `raw` is `false`
   */
  getConfig<K extends keyof T>(key: K, raw?: boolean): T[K];

  /**
   * Set multi key-value paris
   */
  setConfigs(config: Partial<T>): void;

  /**
   * Get all config
   */
  getConfigs(): T;

  /**
   * Remove all content of current store.
   */
  destroy(): void;
}

export type INextStoreSystemType = INextStoreSystem<MainProcessConfig>;

export default INextStoreSystem;
