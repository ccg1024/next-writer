// Cache system for singleton
import { CacheContent } from '_types'

// Current key value is a absolute file path
type Cache = {
  [key: string]: CacheContent
}

class CacheSystem {
  private cache: Cache

  constructor() {
    this.init()
  }

  init() {
    this.cache = {}
  }

  verifyCacheManager() {
    if (!this.cache)
      throw new Error('Some thing wrong, the cache manage did not be create.')
  }

  getCache(filePath: string) {
    this.verifyCacheManager()
    return this.cache[filePath] ?? null
  }
  addCache(filePath: string, cacheContent: CacheContent) {
    this.verifyCacheManager()
    this.cache[filePath] = cacheContent
  }

  update(filePath: string, updateContent: Partial<CacheContent>) {
    this.verifyCacheManager()

    this.cache[filePath] = { ...this.cache[filePath], ...updateContent }

    // modify close icon
    if (!global._next_writer_windowConfig.win) return

    global._next_writer_windowConfig.win.setDocumentEdited(
      this.hasModifiedFile()
    )
  }

  exitCache(filePath: string) {
    return this.cache[filePath] ? true : false
  }

  hasModifiedFile() {
    const keys = Object.getOwnPropertyNames(this.cache)
    for (const key in keys) {
      if (this.cache[key].isChange) {
        return true
      }
    }
    return false
  }

  destroy() {
    this.cache = null
    this.init()
  }
}

// Create single cache system instance
export default new CacheSystem()
