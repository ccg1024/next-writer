/// <reference types="jest" />

import 'reflect-metadata';
import type { LibraryTree } from '_types';
import LibraryTreeStore from './library-tree-store';

describe('LibraryTreeStore', () => {
  it('isolates stored library tree data from caller mutation', () => {
    const store = new LibraryTreeStore();
    const tree = createTree(['note']);

    store.setTree(tree);
    tree.children[0].name = 'changed-before-read';
    const storedTree = store.getTree();
    storedTree.children[0].name = 'changed-after-read';

    expect(store.getTree().children[0].name).toBe('note');
  });

  it('serializes concurrent read-modify-write updates on the latest tree', async () => {
    const store = new LibraryTreeStore();
    let releaseFirstUpdate: () => void;
    const firstUpdateCanContinue = new Promise<void>(resolve => {
      releaseFirstUpdate = resolve;
    });

    store.setTree(createTree([]));

    const firstUpdate = store.updateTree(async tree => {
      await firstUpdateCanContinue;
      tree.children.push(createFileNode('first'));
    });

    const secondUpdate = store.updateTree(tree => {
      tree.children.push(createFileNode('second'));
    });

    releaseFirstUpdate();
    await Promise.all([firstUpdate, secondUpdate]);

    expect(store.getTree().children.map(child => child.name)).toEqual(['first', 'second']);
  });
});

function createTree(fileNames: string[]): LibraryTree {
  return {
    name: 'root',
    type: 'folder',
    birthTime: '',
    modifiedTime: '',
    children: fileNames.map(createFileNode)
  };
}

function createFileNode(name: string): LibraryTree {
  return {
    name,
    type: 'file',
    birthTime: '',
    modifiedTime: '',
    children: []
  };
}
