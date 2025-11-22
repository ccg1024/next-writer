import { CacheContent } from '_types';

export interface Cache {
  [key: string]: CacheContent;
}

/**
 * Next Writer cache system, which to cache recently opened files
 */
interface INextCacheSystem {
  /**
   * Initial a cache instance
   */
  init(): void;

  /**
   * Get the cache object based on the `key` value
   */
  getCache(key: string): CacheContent | null;

  /**
   * Add a cache object for the specified `key` value
   */
  addCache(key: string, cacheContent: CacheContent): void;

  /**
   * Update the cache object corresponding to the `key` value
   */
  update(key: string, updateContent: Partial<CacheContent>): void;

  /**
   * Determine whether the specified `key` value exists in the cahce object
   */
  exitCache(key: string): boolean;

  /**
   * Remove specified cache
   */
  removeCache(key: string): void;

  /**
   * Determine whether the cache object with the specified `key` value has an `isChange` flag set to `true`
   */
  hasModifed(): boolean;

  /**
   * Destroy the current cache instance and reinitialize a new one
   */
  destroy(): void;
}

export default INextCacheSystem;
