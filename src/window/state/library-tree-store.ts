import { injectable } from 'inversify';
import type { RootLibraryTree } from '_types';
import ILibraryTreeStore from '../interface/library-tree-store';

@injectable()
class LibraryTreeStore implements ILibraryTreeStore {
  private tree: RootLibraryTree;
  private updateQueue: Promise<void> = Promise.resolve();

  setTree(tree: RootLibraryTree): void {
    this.tree = this.cloneTree(tree);
  }

  getTree(): RootLibraryTree {
    return this.cloneTree(this.tree);
  }

  async updateTree<T>(updater: (tree: RootLibraryTree) => T | Promise<T>): Promise<T> {
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

  private cloneTree(tree: RootLibraryTree): RootLibraryTree {
    return tree ? JSON.parse(JSON.stringify(tree)) : tree;
  }
}

export default LibraryTreeStore;
