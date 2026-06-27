import type { RootLibraryTree } from '_types';

interface ILibraryTreeStore {
  setTree(tree: RootLibraryTree): void;
  getTree(): RootLibraryTree;
  updateTree<T>(updater: (tree: RootLibraryTree) => T | Promise<T>): Promise<T>;
}

export default ILibraryTreeStore;
