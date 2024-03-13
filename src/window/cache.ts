// cache system to reduce file operation.
import { CacheContent } from '_window_type'

interface CacheManager {
  init: () => void
  getCache: (filePath: string) => CacheContent | null
  addCache: (filePath: string, cacheContent: CacheContent) => void
  update: (filePath: string, updateContent: Partial<CacheContent>) => void
  exitCache: (filePath: string) => boolean
  [key: string]: unknown
}

export const cacheManager: CacheManager = {
  init() {
    this.cache = {}
  },
  getCache(filePath: string) {
    if (!this.cache) throw 'cacheManager did not run `init()`, before use it'
    return this.cache[filePath] ? this.cache[filePath] : null
  },
  addCache(filePath: string, cacheContent: CacheContent) {
    if (!this.cache) throw 'cacheManager did not run `init()`, before use it'

    this.cache[filePath] = cacheContent
  },
  update(filePath: string, updateContent: Partial<CacheContent>) {
    if (!this.cache) throw 'cacheManager did not run `init()`, before use it'

    this.cache[filePath] = {
      ...this.cache[filePath],
      ...updateContent
    }
  },
  exitCache(filePath: string) {
    return this.cache[filePath] ? true : false
  }
}

const cacheAccessor: CacheManager = Object.create(cacheManager)

export function initCacheAccessor() {
  cacheAccessor.init()
}

export function exitCache(filePath: string): boolean {
  return cacheAccessor.exitCache(filePath)
}

export function getCache(filePath: string) {
  return cacheAccessor.getCache(filePath)
}

export function updateCache(filePath: string, update: Partial<CacheContent>) {
  cacheAccessor.update(filePath, update)
}

export function addCache(filePath: string, cache: CacheContent) {
  cacheAccessor.addCache(filePath, cache)
}
