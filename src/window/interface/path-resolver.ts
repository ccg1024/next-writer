export interface ResolvedLibraryPath {
  relativePath: string;
  fullPath: string;
  pathToken: string[];
}

interface IPathResolver {
  resolveWithinRoot(rootDir: string, targetPath: string): string;
  resolveLibraryPath(path: string, options?: { suffix?: string }): ResolvedLibraryPath;
}

export default IPathResolver;
