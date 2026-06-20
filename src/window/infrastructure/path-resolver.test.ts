/// <reference types="jest" />

import 'reflect-metadata';
import nodeFs from 'fs';
import nodeOs from 'os';
import nodePath from 'path';
import IAppPathStore from '../interface/app-path-store';
import PathResolver from './path-resolver';

describe('PathResolver', () => {
  let rootDir: string;
  let resolver: PathResolver;

  beforeEach(async () => {
    rootDir = await nodeFs.promises.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'next-writer-path-'));
    resolver = new PathResolver(createAppPathStore());
  });

  afterEach(async () => {
    await nodeFs.promises.rm(rootDir, { recursive: true, force: true });
  });

  it('resolves paths inside the allowed root', () => {
    const targetPath = nodePath.join(rootDir, 'docs', 'note.md');

    expect(resolver.resolveWithinRoot(rootDir, targetPath)).toBe(targetPath);
  });

  it('rejects path traversal outside the allowed root', () => {
    const targetPath = nodePath.join(rootDir, '..', 'secret.md');

    expect(() => resolver.resolveWithinRoot(rootDir, targetPath)).toThrow('The path is outside of the allowed root.');
  });

  it('rejects absolute paths outside the allowed root', () => {
    const targetPath = nodePath.join(nodeOs.tmpdir(), 'outside-next-writer.md');

    expect(() => resolver.resolveWithinRoot(rootDir, targetPath)).toThrow('The path is outside of the allowed root.');
  });

  it('resolves relative library paths with a suffix once', () => {
    expect(resolver.resolveLibraryPath('./docs/note', { suffix: '.md' })).toEqual({
      relativePath: 'docs/note',
      fullPath: nodePath.join(rootDir, 'docs', 'note.md'),
      pathToken: ['docs', 'note']
    });

    expect(resolver.resolveLibraryPath('./docs/note.md', { suffix: '.md' })).toEqual({
      relativePath: 'docs/note.md',
      fullPath: nodePath.join(rootDir, 'docs', 'note.md'),
      pathToken: ['docs', 'note.md']
    });
  });

  it('preserves root-contained absolute markdown paths', () => {
    const absolutePath = nodePath.join(rootDir, 'docs', 'note.md');

    expect(resolver.resolveLibraryPath(absolutePath, { suffix: '.md' })).toEqual({
      relativePath: 'docs/note.md',
      fullPath: absolutePath,
      pathToken: ['docs', 'note.md']
    });
  });

  it('rejects empty root and path values', () => {
    const validRootDir = rootDir;
    rootDir = '';

    expect(() => resolver.resolveLibraryPath('./docs/note', { suffix: '.md' })).toThrow(
      'The library root path is empty.'
    );

    rootDir = validRootDir;

    expect(() => resolver.resolveLibraryPath('', { suffix: '.md' })).toThrow('The library path is empty.');
    expect(() => resolver.resolveWithinRoot('', nodePath.join(rootDir, 'docs', 'note.md'))).toThrow(
      'Cannot resolve empty path.'
    );
  });

  function createAppPathStore(): IAppPathStore {
    return {
      setPaths(paths: { rootDir?: string }) {
        rootDir = paths.rootDir ?? rootDir;
      },
      setRootDir(nextRootDir: string) {
        rootDir = nextRootDir;
      },
      getRootDir() {
        return rootDir;
      },
      getConfigDir() {
        return '';
      },
      getLogDir() {
        return '';
      }
    };
  }
});
