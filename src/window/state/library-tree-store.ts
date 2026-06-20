import { injectable } from 'inversify';
import type { LibraryTree } from '_types';
import ILibraryTreeStore from '../interface/library-tree-store';

@injectable()
class LibraryTreeStore implements ILibraryTreeStore {
  private tree: LibraryTree;
  private updateQueue: Promise<void> = Promise.resolve();

  setTree(tree: LibraryTree): void {
    this.tree = this.cloneTree(tree);
  }

  getTree(): LibraryTree {
    return this.cloneTree(this.tree);
  }

  async updateTree<T>(updater: (tree: LibraryTree) => T | Promise<T>): Promise<T> {
    let result: T;

    const update = this.updateQueue.then(async () => {
      const nextTree = this.cloneTree(this.tree);
      result = await updater(nextTree);
      this.tree = this.cloneTree(nextTree);
    });

    this.updateQueue = update.catch(() => undefined);
    await update;

    return result;
  }

  private cloneTree(tree: LibraryTree): LibraryTree {
    return tree ? JSON.parse(JSON.stringify(tree)) : tree;
  }
}

export default LibraryTreeStore;
