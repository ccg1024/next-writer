import { inject, injectable } from 'inversify';
import { isEffectObject, isTrulyEmpty } from 'src/tools/utils';
import { Cache, CacheContent, MainProcessConfig } from '_types';
import INextCacheSystem from '../interface/next-cache-system';
import INextStoreSystem from '../interface/next-store-system';
import { TYPES } from '../types';

@injectable()
class NextCacheSystem implements INextCacheSystem {
  private __cache: Cache;
  private __sotre: INextStoreSystem<MainProcessConfig>;
  constructor(@inject(TYPES.INextStoreSystem) nextSotreSystem: INextStoreSystem<MainProcessConfig>) {
    this.init();
    this.__sotre = nextSotreSystem;
  }

  init(): void {
    this.__cache = {};
  }

  getCache(key: string): CacheContent {
    return this.__cache?.[key] ?? null;
  }

  addCache(key: string, cacheContent: CacheContent): void {
    this.__cache = {
      ...(this.__cache ?? {}),
      [key]: cacheContent
    };
  }

  update(key: string, updateContent: Partial<CacheContent>): void {
    if (isTrulyEmpty(this.__cache[key])) {
      return;
    }

    this.__cache = {
      ...this.__cache,
      [key]: {
        ...this.__cache[key],
        ...(updateContent ?? {})
      }
    };

    const win = this.__sotre.getConfig('win');

    if (!win) {
      return;
    }

    win.setDocumentEdited(this.hasModifed());
  }

  exitCache(key: string): boolean {
    return this.__cache?.[key] ? true : false;
  }

  hasModifed(): boolean {
    if (isEffectObject(this.__cache)) {
      const keys = Object.getOwnPropertyNames(this.__cache);
      for (const key in keys) {
        if (this.__cache[key].isChange) {
          return true;
        }
      }
    }
    return false;
  }

  destroy(): void {
    this.__cache = null;
    this.init();
  }
}

export default NextCacheSystem;
