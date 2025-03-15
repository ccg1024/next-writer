import { inject, injectable } from 'inversify';
import { isEffectObject } from 'src/tools/utils';
import { Cache, CacheContent } from '_types';
import CacheSystem from '../interface/cache';
import MainGlobal from '../interface/main-global';
import { TYPES } from '../types';

@injectable()
class NextCahce implements CacheSystem {
  private cache: Cache;
  private _mainGlobal: MainGlobal;
  constructor(@inject(TYPES.MainGlobal) _mainGlobal: MainGlobal) {
    this.init();
    this._mainGlobal = _mainGlobal;
  }

  init(): void {
    this.cache = {};
  }

  verifyCacheManager(): boolean {
    if (!isEffectObject(this.cache)) {
      return true;
    }
    return false;
  }

  getCache(key: string): CacheContent {
    if (this.verifyCacheManager()) {
      return this.cache[key] ?? null;
    }
    return null;
  }

  addCache(key: string, cacheContent: CacheContent): void {
    if (this.verifyCacheManager()) {
      this.cache[key] = cacheContent;
    }
  }

  update(key: string, updateContent: Partial<CacheContent>): void {
    if (this.verifyCacheManager()) {
      this.cache[key] = { ...this.cache[key], ...(updateContent || {}) };
    }
    const win = this._mainGlobal.getConfig('win');
    if (!win) {
      return;
    }

    win.setDocumentEdited(this.hasModifed());
  }

  exitCache(key: string): boolean {
    return this.cache?.[key] ? true : false;
  }

  hasModifed(): boolean {
    if (this.verifyCacheManager()) {
      const keys = Object.getOwnPropertyNames(this.cache);
      for (const key in keys) {
        if (this.cache[key].isChange) {
          return true;
        }
      }
    }
    return false;
  }

  destroy(): void {
    this.cache = null;
    this.init();
  }
}

export default NextCahce;
