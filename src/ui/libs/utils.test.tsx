/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

import { render, screen } from '@testing-library/react';
import React from 'react';
import { debounceFn, generateRuntimeInfo } from './utils';
import type { RendererLibraryTree } from '_types';

describe('renderer test environment', () => {
  it('renders React components with jest-dom matchers', () => {
    render(<button type="button">Save</button>);

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});

describe('ui utils', () => {
  it('debounces a function call', () => {
    jest.useFakeTimers();
    const fn = jest.fn();
    const debounced = debounceFn(fn, 250);

    debounced('first');
    debounced('second');
    jest.advanceTimersByTime(249);
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('second');

    jest.useRealTimers();
  });

  it('generates renderer runtime fields recursively', () => {
    const libTree: RendererLibraryTree = {
      name: 'root',
      type: 'folder' as const,
      birthTime: '2024-01-01',
      modifiedTime: '2024-01-01',
      children: [
        {
          name: 'draft.md',
          type: 'file' as const,
          birthTime: '2024-01-01',
          modifiedTime: '2024-01-01',
          children: []
        }
      ]
    };

    generateRuntimeInfo(libTree, null);

    expect(libTree.relativePath).toBe('.');
    expect(libTree.id).toEqual(expect.any(String));
    expect(libTree.children[0].relativePath).toBe('./draft.md');
    expect(libTree.children[0].parent).toBe(libTree);
  });
});
