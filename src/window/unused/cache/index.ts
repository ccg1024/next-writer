import type { BrowserWindow } from 'electron';
import { CacheContent } from '_types';

// Current key value is a absolute file path
type Cache = {
  [key: string]: CacheContent;
};

/**
 * Next Writer cache system, which to cache recently opened files.
 *
 * @author crazycodegame
 */
class CacheSystem {
  private cache: Cache;
  private _win: BrowserWindow;

  constructor(win: BrowserWindow) {
    this.init();
    this._win = win;
  }

  init() {
    this.cache = {};
  }

  verifyCacheManager() {
    if (!this.cache) throw new Error('Some thing wrong, the cache manage did not be create.');
  }

  getCache(filePath: string) {
    this.verifyCacheManager();
    return this.cache[filePath] ?? null;
  }
  addCache(filePath: string, cacheContent: CacheContent) {
    this.verifyCacheManager();
    this.cache[filePath] = cacheContent;
  }

  update(filePath: string, updateContent: Partial<CacheContent>) {
    this.verifyCacheManager();

    this.cache[filePath] = { ...this.cache[filePath], ...updateContent };

    // modify close icon
    if (!this._win) return;

    this._win.setDocumentEdited(this.hasModifiedFile());
  }

  exitCache(filePath: string) {
    return this.cache[filePath] ? true : false;
  }

  hasModifiedFile() {
    const keys = Object.getOwnPropertyNames(this.cache);
    for (const key in keys) {
      if (this.cache[key].isChange) {
        return true;
      }
    }
    return false;
  }

  destroy() {
    this.cache = null;
    this.init();
  }
}

export default CacheSystem;
