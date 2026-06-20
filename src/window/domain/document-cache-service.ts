import { inject, injectable } from 'inversify';
import { isEffectObject, isTrulyEmpty } from 'src/tools/utils';
import { Cache, CacheContent } from '_types';
import IDocumentCacheService from '../interface/document-cache-service';
import IWindowRegistry from '../interface/window-registry';
import { TYPES } from '../types';

@injectable()
class DocumentCacheService implements IDocumentCacheService {
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

  hasCache(key: string): boolean {
    return this.__cache?.[key] ? true : false;
  }

  removeCache(key: string): void {
    if (this.hasCache(key)) {
      delete this.__cache[key];

      this.updateDocumentEditedState();
    }
  }

  hasModified(): boolean {
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
    win?.setDocumentEdited(this.hasModified());
  }
}

export default DocumentCacheService;
