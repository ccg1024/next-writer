/// <reference types="jest" />
/// <reference types="@testing-library/jest-dom" />

import { render, screen } from '@testing-library/react';
import React from 'react';
import { ROOT_LIBRARY_ID } from 'src/config/env';
import { debounceFn, generateRuntimeInfo } from './utils';
import type { RendererRootLibraryTree } from '_types';

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
    const libTree: RendererRootLibraryTree = {
      id: ROOT_LIBRARY_ID,
      children: [
        {
          id: 'draft-id',
          name: 'draft.md',
          type: 'file' as const,
          birthTime: '2024-01-01',
          modifiedTime: '2024-01-01',
          children: []
        }
      ]
    };

    generateRuntimeInfo(libTree, null);

    expect(libTree.id).toBe(ROOT_LIBRARY_ID);
    expect(libTree.children[0].parent).toBe(libTree);
  });
});
