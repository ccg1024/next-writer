import type { RendererLibraryBase, RendererLibraryNode, RendererLibraryTree, RendererRootLibraryTree } from '_types';
import {
  findRendererNodeById,
  refreshRendererTree,
  type RendererTreeOperation,
  updateRendererTree
} from 'src/ui/libs/renderer-tree';
import type { LibraryState } from './index';

export type LibraryNodeProducer =
  | RendererLibraryTree
  | ((preLib: RendererLibraryTree, preNote: RendererLibraryTree) => RendererLibraryTree);
export type LibraryNodePatch = Partial<RendererLibraryBase>;

export class LibraryStateContainer {
  private constructor(private readonly state: LibraryState) {}

  static of(state: LibraryState): LibraryStateContainer {
    return new LibraryStateContainer(state);
  }

  value(): LibraryState {
    return this.state;
  }

  setLibraryTree(tree: RendererRootLibraryTree): LibraryStateContainer {
    const libraryTree = refreshRendererTree(tree, this.state.libraryTree);
    return new LibraryStateContainer({
      ...this.syncSelectedNodes(libraryTree)
    });
  }

  setCurrentLib(node: RendererLibraryTree): LibraryStateContainer {
    return new LibraryStateContainer({ ...this.state, currentLib: node });
  }

  setCurrentNote(node: RendererLibraryTree): LibraryStateContainer {
    return new LibraryStateContainer({ ...this.state, currentNote: node });
  }

  refreshTree(): LibraryStateContainer {
    if (!this.state.libraryTree) {
      return this;
    }

    const libraryTree = refreshRendererTree(this.state.libraryTree, this.state.libraryTree);
    return new LibraryStateContainer(this.syncSelectedNodes(libraryTree));
  }

  updateNode(newNode: LibraryNodeProducer, operation: RendererTreeOperation): LibraryStateContainer {
    const targetNode = this.resolveNode(newNode);
    if (!this.state.libraryTree || !targetNode) {
      return this;
    }

    const libraryTree = updateRendererTree(this.state.libraryTree, targetNode, operation);
    return new LibraryStateContainer(this.syncSelectedNodes(libraryTree));
  }

  patchCurrentNote(patch: LibraryNodePatch): LibraryStateContainer {
    return this.patchNode(this.state.currentNote, patch);
  }

  patchNode(node: RendererLibraryTree, patch: LibraryNodePatch): LibraryStateContainer {
    if (!node) {
      return this;
    }

    return this.updateNode({ ...node, ...patch }, 'update');
  }

  appendChild(parent: RendererLibraryNode, child: RendererLibraryTree): LibraryStateContainer {
    if (!parent || !child) {
      return this;
    }

    return this.updateNode({ ...child, parent }, 'append');
  }

  private resolveNode(newNode: LibraryNodeProducer): RendererLibraryTree {
    if (typeof newNode === 'function') {
      return newNode(this.state.currentLib, this.state.currentNote);
    }

    return newNode;
  }

  private syncSelectedNodes(libraryTree: RendererRootLibraryTree): LibraryState {
    return {
      libraryTree,
      currentLib: findRendererNodeById(libraryTree, this.state.currentLib?.id),
      currentNote: findRendererNodeById(libraryTree, this.state.currentNote?.id)
    };
  }
}
