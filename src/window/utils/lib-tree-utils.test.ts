/// <reference types="jest" />

import { ROOT_LIBRARY_ID } from 'src/config/env';
import {
  extractTargetAndParent,
  getParentPathTokens,
  getTargetName,
  normalizeLibraryTree,
  parsePathInfo,
  resolveLibraryNodePath
} from './lib-tree-utils';
import type IFileSystem from '../interface/file-system';

describe('lib-tree-utils', () => {
  const fileSys = {
    formatPath: jest.fn((path: string) => path)
  } as unknown as IFileSystem & { formatPath: jest.Mock<string, [string]> };

  beforeEach(() => {
    fileSys.formatPath.mockClear();
  });

  it('parses a path relative to the library root', () => {
    const pathInfo = parsePathInfo('/workspace/docs/readme.md', '/workspace', fileSys);

    expect(pathInfo).toEqual({
      relativePath: '/docs/readme.md',
      fullPath: '/workspace/docs/readme.md',
      pathToken: ['docs', 'readme.md']
    });
    expect(fileSys.formatPath).toHaveBeenCalledWith('/workspace/docs/readme.md');
  });

  it('reads target and parent path tokens without mutating the original array', () => {
    const pathTokens = ['docs', 'drafts', 'readme.md'];

    expect(getTargetName(pathTokens, { stripExtension: true })).toBe('readme');
    expect(getParentPathTokens(pathTokens)).toEqual(['docs', 'drafts']);
    expect(pathTokens).toEqual(['docs', 'drafts', 'readme.md']);
  });

  it('extracts target and parent path tokens with the documented mutation', () => {
    const pathTokens = ['docs', 'drafts', 'readme.md'];

    expect(extractTargetAndParent(pathTokens, { stripExtension: true })).toEqual({
      targetName: 'readme',
      parentPathTokens: ['docs', 'drafts']
    });
    expect(pathTokens).toEqual(['docs', 'drafts']);
  });

  it('normalizes old library records with persistent ids', () => {
    const migration = normalizeLibraryTree({
      children: [
        {
          name: 'docs',
          type: 'folder',
          birthTime: '',
          modifiedTime: '',
          relativePath: './docs',
          children: [
            {
              name: 'readme',
              type: 'file',
              birthTime: '',
              modifiedTime: '',
              relativePath: './docs/readme',
              children: []
            }
          ]
        }
      ]
    });

    expect(migration.migrated).toBe(true);
    expect(migration.tree.id).toBe(ROOT_LIBRARY_ID);
    expect(migration.tree.children[0].id).toEqual(expect.any(String));
    expect(migration.tree.children[0].children[0].id).toEqual(expect.any(String));
  });

  it('resolves a node id to the current filesystem path', () => {
    const resolved = resolveLibraryNodePath(
      {
        id: ROOT_LIBRARY_ID,
        children: [
          {
            id: 'folder-id',
            name: 'archive',
            type: 'folder',
            birthTime: '',
            modifiedTime: '',
            children: [
              {
                id: 'note-id',
                name: 'note',
                type: 'file',
                birthTime: '',
                modifiedTime: '',
                children: []
              }
            ]
          }
        ]
      },
      'note-id',
      '/workspace'
    );

    expect(resolved.pathTokens).toEqual(['archive', 'note']);
    expect(resolved.parentPathTokens).toEqual(['archive']);
    expect(resolved.fullPath).toBe('/workspace/archive/note.md');
  });
});
