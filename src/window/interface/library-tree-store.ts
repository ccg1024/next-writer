import type { LibraryTree } from '_types';

interface ILibraryTreeStore {
  setTree(tree: LibraryTree): void;
  getTree(): LibraryTree;
  updateTree<T>(updater: (tree: LibraryTree) => T | Promise<T>): Promise<T>;
}

export default ILibraryTreeStore;
