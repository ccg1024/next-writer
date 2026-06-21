/// <reference types="jest" />

import { RendererLibraryTree } from '_types';
import { libraryReducer, LibraryState } from './index';

function createTree(): RendererLibraryTree {
  return {
    name: 'root',
    type: 'folder',
    birthTime: '2024-01-01',
    modifiedTime: '2024-01-01',
    children: [
      {
        name: 'drafts',
        type: 'folder',
        birthTime: '2024-01-01',
        modifiedTime: '2024-01-01',
        children: [
          {
            name: 'first.md',
            type: 'file',
            birthTime: '2024-01-01',
            modifiedTime: '2024-01-01',
            description: 'first',
            children: []
          }
        ]
      }
    ]
  };
}

const emptyState: LibraryState = {
  libraryTree: null,
  currentLib: null,
  currentNote: null
};

describe('libraryReducer', () => {
  it('loads a renderer tree and generates runtime fields', () => {
    const state = libraryReducer(emptyState, { type: 'set-library-tree', tree: createTree() });

    expect(state.libraryTree.relativePath).toBe('.');
    expect(state.libraryTree.children[0].relativePath).toBe('./drafts');
    expect(state.libraryTree.children[0].parent).toBe(state.libraryTree);
    expect(state.currentLib).toBeNull();
    expect(state.currentNote).toBeNull();
  });

  it('keeps selected lib and note synced after node updates', () => {
    let state = libraryReducer(emptyState, { type: 'set-library-tree', tree: createTree() });
    const lib = state.libraryTree.children[0];
    const note = lib.children[0];
    state = libraryReducer(state, { type: 'set-current-lib', node: lib });
    state = libraryReducer(state, { type: 'set-current-note', node: note });
    state = libraryReducer(state, {
      type: 'update-node',
      operation: 'update',
      newNode: { ...note, description: 'updated' }
    });

    expect(state.currentLib.name).toBe('drafts');
    expect(state.currentNote.description).toBe('updated');
    expect(state.currentNote.parent).toBe(state.currentLib);
  });

  it('appends and removes child nodes', () => {
    let state = libraryReducer(emptyState, { type: 'set-library-tree', tree: createTree() });
    const lib = state.libraryTree.children[0];
    const newNote: RendererLibraryTree = {
      name: 'second.md',
      type: 'file',
      birthTime: '2024-01-02',
      modifiedTime: '2024-01-02',
      parent: lib,
      children: []
    };

    state = libraryReducer(state, { type: 'update-node', operation: 'append', newNode: newNote });
    expect(state.libraryTree.children[0].children.map(child => child.name)).toEqual(['first.md', 'second.md']);

    const appended = state.libraryTree.children[0].children[1];
    state = libraryReducer(state, { type: 'update-node', operation: 'remove', newNode: appended });

    expect(state.libraryTree.children[0].children.map(child => child.name)).toEqual(['first.md']);
  });
});
