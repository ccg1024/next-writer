import { inject, injectable } from 'inversify';
import { isEffectObject, isTrulyEmpty } from 'src/tools/utils';
import { Cache, CacheContent } from '_types';
import INextCacheSystem from '../interface/next-cache-system';
import IWindowRegistry from '../interface/window-registry';
import { TYPES } from '../types';

@injectable()
class NextCacheSystem implements INextCacheSystem {
  private __cache: Cache;
  constructor(@inject(TYPES.IWindowRegistry) private windowRegistry: IWindowRegistry) {
    this.init();
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

    // Update window document edited state
    this.updateDocumentEditedState();
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

    this.updateDocumentEditedState();
  }

  exitCache(key: string): boolean {
    return this.__cache?.[key] ? true : false;
  }

  removeCache(key: string): void {
    if (this.exitCache(key)) {
      delete this.__cache[key];

      // Update window document edited state
      this.updateDocumentEditedState();
    }
  }

  hasModifed(): boolean {
    if (isEffectObject(this.__cache)) {
      const keys = Object.getOwnPropertyNames(this.__cache);
      for (const key of keys) {
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

  private updateDocumentEditedState(): void {
    const win = this.windowRegistry.getCurrentWindow();
    win?.setDocumentEdited(this.hasModifed());
  }
}

export default NextCacheSystem;
