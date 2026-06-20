import { CacheContent } from '_types';

export interface Cache {
  [key: string]: CacheContent;
}

interface IDocumentCacheService {
  init(): void;

  getCache(key: string): CacheContent | null;

  addCache(key: string, cacheContent: CacheContent): void;

  update(key: string, updateContent: Partial<CacheContent>): void;

  hasCache(key: string): boolean;

  removeCache(key: string): void;

  hasModified(): boolean;

  destroy(): void;
}

export default IDocumentCacheService;
