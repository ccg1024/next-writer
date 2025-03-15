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
   */
  getConfig<K extends keyof T>(key: K): T[K];

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
