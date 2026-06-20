/// <reference types="jest" />

import 'reflect-metadata';
import nodeFs from 'fs';
import nodeOs from 'os';
import nodePath from 'path';
import FileSystem from './file-system';

describe('FileSystem', () => {
  let rootDir: string;
  let fileSystem: FileSystem;

  beforeEach(async () => {
    rootDir = await nodeFs.promises.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'next-writer-file-system-'));
    fileSystem = new FileSystem();
  });

  afterEach(async () => {
    await nodeFs.promises.rm(rootDir, { recursive: true, force: true });
  });

  it('formats paths with posix separators', () => {
    const notePath = ['dir', 'note.md'].join(nodePath.sep);
    const imagePath = ['dir', 'image.png'].join(nodePath.sep);

    expect(fileSystem.formatPath(notePath)).toBe('dir/note.md');
    expect(fileSystem.formatPath([notePath, imagePath])).toEqual(['dir/note.md', 'dir/image.png']);
  });

  it('rejects empty paths for file operations', async () => {
    await expect(fileSystem.exists('')).rejects.toThrow('The `path` is truly empty when invoke `exists`');
    await expect(fileSystem.readFile('')).rejects.toThrow('The `path` is empty when invoke `readFile`');
    await expect(fileSystem.writeFile('', 'content')).rejects.toThrow('The `path` is empty when invoke `writeFile`');
    await expect(fileSystem.ensureDir('')).rejects.toThrow('The `path` is empty when invoke `ensureDir`');
    await expect(fileSystem.stat('')).rejects.toThrow('The `path` is empty when invoke `stat`');
    await expect(fileSystem.rename('', nodePath.join(rootDir, 'next.md'))).rejects.toThrow(
      'The path is empty when invoke `rename`'
    );
    await expect(fileSystem.removeFile('')).rejects.toThrow('The `path` is empty when invoke `removeFile`');
    await expect(fileSystem.removeEmptyDir('')).rejects.toThrow('The `path` is empty when invoke `removeEmptyDir`');
    await expect(fileSystem.readDir('')).rejects.toThrow('The `path` is empty when invoke `readDir`');
  });

  it('writes files and creates parent directories', async () => {
    const filePath = nodePath.join(rootDir, 'nested', 'note.md');

    await fileSystem.writeFile(filePath, 'content');

    await expect(fileSystem.readFile(filePath, { encoding: 'utf8' })).resolves.toBe('content');
    await expect(fileSystem.exists(filePath)).resolves.toBe(true);
  });

  it('returns false when a path does not exist', async () => {
    await expect(fileSystem.exists(nodePath.join(rootDir, 'missing.md'))).resolves.toBe(false);
  });

  it('adapts directory, stat, rename, remove, and readDir operations', async () => {
    const dirPath = nodePath.join(rootDir, 'docs');
    const originalPath = nodePath.join(dirPath, 'note.md');
    const renamedPath = nodePath.join(dirPath, 'renamed.md');

    await fileSystem.ensureDir(dirPath);
    await fileSystem.writeFile(originalPath, 'content');

    const fileState = await fileSystem.stat(originalPath);
    expect(fileState.isFile()).toBe(true);

    await fileSystem.rename(originalPath, renamedPath);
    await expect(fileSystem.exists(originalPath)).resolves.toBe(false);
    await expect(fileSystem.exists(renamedPath)).resolves.toBe(true);

    const files = await fileSystem.readDir(dirPath);
    expect(files.map(file => file.name)).toEqual(['renamed.md']);

    await fileSystem.removeFile(renamedPath);
    await fileSystem.removeEmptyDir(dirPath);
    await expect(fileSystem.exists(dirPath)).resolves.toBe(false);
  });
});
