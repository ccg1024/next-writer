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

  it('keeps selected nodes rebound after refreshing the tree', () => {
    let state = libraryReducer(emptyState, { type: 'set-library-tree', tree: createTree() });
    const lib = state.libraryTree.children[0];
    const note = lib.children[0];
    state = libraryReducer(state, { type: 'set-current-lib', node: lib });
    state = libraryReducer(state, { type: 'set-current-note', node: note });

    const refreshedState = libraryReducer(state, { type: 'fresh-tree' });

    expect(refreshedState.libraryTree).not.toBe(state.libraryTree);
    expect(refreshedState.currentLib).not.toBe(lib);
    expect(refreshedState.currentLib.id).toBe(lib.id);
    expect(refreshedState.currentNote).not.toBe(note);
    expect(refreshedState.currentNote.id).toBe(note.id);
    expect(refreshedState.currentNote.parent).toBe(refreshedState.currentLib);
  });

  it('updates a selected node with a functional producer', () => {
    let state = libraryReducer(emptyState, { type: 'set-library-tree', tree: createTree() });
    const lib = state.libraryTree.children[0];
    const note = lib.children[0];
    state = libraryReducer(state, { type: 'set-current-lib', node: lib });
    state = libraryReducer(state, { type: 'set-current-note', node: note });

    state = libraryReducer(state, {
      type: 'update-node',
      operation: 'update',
      newNode: (preLib, preNote) => ({
        ...preNote,
        description: `${preLib.name}: changed`,
        isChange: true
      })
    });

    expect(state.currentNote.description).toBe('drafts: changed');
    expect(state.currentNote.isChange).toBe(true);
    expect(state.libraryTree.children[0].children[0]).toBe(state.currentNote);
  });

  it('patches current note fields and rebinds selected nodes', () => {
    let state = libraryReducer(emptyState, { type: 'set-library-tree', tree: createTree() });
    const lib = state.libraryTree.children[0];
    const note = lib.children[0];
    state = libraryReducer(state, { type: 'set-current-lib', node: lib });
    state = libraryReducer(state, { type: 'set-current-note', node: note });

    state = libraryReducer(state, {
      type: 'patch-current-note',
      patch: {
        name: 'renamed.md',
        description: 'renamed',
        isChange: true
      }
    });

    expect(state.currentNote.name).toBe('renamed.md');
    expect(state.currentNote.description).toBe('renamed');
    expect(state.currentNote.isChange).toBe(true);
    expect(state.currentNote.relativePath).toBe('./drafts/renamed.md');
    expect(state.currentNote.parent).toBe(state.currentLib);
  });

  it('patches a library node and keeps selections synced', () => {
    let state = libraryReducer(emptyState, { type: 'set-library-tree', tree: createTree() });
    const lib = state.libraryTree.children[0];
    const note = lib.children[0];
    state = libraryReducer(state, { type: 'set-current-lib', node: lib });
    state = libraryReducer(state, { type: 'set-current-note', node: note });

    state = libraryReducer(state, {
      type: 'patch-library-node',
      node: lib,
      patch: { name: 'archive' }
    });

    expect(state.currentLib.name).toBe('archive');
    expect(state.currentLib.relativePath).toBe('./archive');
    expect(state.currentNote.name).toBe('first.md');
    expect(state.currentNote.relativePath).toBe('./archive/first.md');
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

  it('appends children with parent filled by the container', () => {
    let state = libraryReducer(emptyState, { type: 'set-library-tree', tree: createTree() });
    const lib = state.libraryTree.children[0];
    const newNote: RendererLibraryTree = {
      name: 'second.md',
      type: 'file',
      birthTime: '2024-01-02',
      modifiedTime: '2024-01-02',
      children: []
    };

    state = libraryReducer(state, {
      type: 'append-library-child',
      parent: lib,
      child: newNote
    });

    const appended = state.libraryTree.children[0].children[1];
    expect(appended.name).toBe('second.md');
    expect(appended.parent).toBe(state.libraryTree.children[0]);
    expect(appended.relativePath).toBe('./drafts/second.md');
  });

  it('returns the current state when refreshing or updating empty state', () => {
    expect(libraryReducer(emptyState, { type: 'fresh-tree' })).toBe(emptyState);
    expect(
      libraryReducer(emptyState, {
        type: 'update-node',
        operation: 'update',
        newNode: null
      })
    ).toBe(emptyState);
    expect(libraryReducer(emptyState, { type: 'patch-current-note', patch: { name: 'empty.md' } })).toBe(emptyState);
    expect(libraryReducer(emptyState, { type: 'patch-library-node', node: null, patch: { name: 'empty.md' } })).toBe(
      emptyState
    );
    expect(libraryReducer(emptyState, { type: 'append-library-child', parent: null, child: null })).toBe(emptyState);
  });
});
