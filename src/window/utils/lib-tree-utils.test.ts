/// <reference types="jest" />

import { extractTargetAndParent, getParentPathTokens, getTargetName, parsePathInfo } from './lib-tree-utils';
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
});
