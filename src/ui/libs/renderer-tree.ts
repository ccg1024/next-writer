import { RendererLibraryNode, RendererLibraryTree, RendererRootLibraryTree } from '_types';
import { isEffectArray, isEffectObject, isTrulyEmpty } from 'src/tools/utils';

export type RendererTreeOperation = 'append' | 'remove' | 'update';

type TransientState = Pick<RendererLibraryTree, 'description' | 'isChange'>;

export function refreshRendererTree(
  root: RendererRootLibraryTree,
  previousRoot?: RendererRootLibraryTree
): RendererRootLibraryTree {
  const transientState = collectTransientState(previousRoot);
  return cloneRendererRoot(root, transientState);
}

export function updateRendererTree(
  root: RendererRootLibraryTree,
  target: RendererLibraryTree,
  operation: RendererTreeOperation
): RendererRootLibraryTree {
  if (!isEffectObject(root) || !isEffectObject(target)) {
    return root;
  }

  return applyRendererRootOperation(root, target, operation);
}

export function findRendererNodeById(root: RendererRootLibraryTree, id?: string): RendererLibraryTree | null {
  if (isTrulyEmpty(id) || !isEffectObject(root)) {
    return null;
  }

  for (const child of root.children) {
    const target = findRendererTreeNodeById(child, id);
    if (target) {
      return target;
    }
  }

  return null;
}

function applyRendererRootOperation(
  root: RendererRootLibraryTree,
  target: RendererLibraryTree,
  operation: RendererTreeOperation
): RendererRootLibraryTree {
  const nextRoot: RendererRootLibraryTree = {
    id: root.id,
    children: []
  };
  const sourceChildren = isEffectArray(root.children) ? root.children : [];
  nextRoot.children = sourceChildren.reduce<RendererLibraryTree[]>((children, child) => {
    if (operation === 'remove' && child.id === target.id) {
      return children;
    }
    children.push(applyRendererNodeOperation(child, target, operation, nextRoot));
    return children;
  }, []);

  if (operation === 'append' && target.parent?.id === root.id) {
    nextRoot.children.push(cloneRendererNode(target, nextRoot));
  }

  return nextRoot;
}

function applyRendererNodeOperation(
  node: RendererLibraryTree,
  target: RendererLibraryTree,
  operation: RendererTreeOperation,
  parent: RendererLibraryNode
): RendererLibraryTree {
  const source = operation === 'update' && node.id === target.id ? target : node;
  const nextNode = cloneRendererNodeWithoutChildren(source, parent);
  const sourceChildren = isEffectArray(source.children) ? source.children : [];
  const nextChildren = sourceChildren.reduce<RendererLibraryTree[]>((children, child) => {
    if (operation === 'remove' && child.id === target.id) {
      return children;
    }
    children.push(applyRendererNodeOperation(child, target, operation, nextNode));
    return children;
  }, []);

  if (operation === 'append' && node.id === target.parent?.id) {
    nextChildren.push(cloneRendererNode(target, nextNode));
  }

  nextNode.children = nextChildren;
  return nextNode;
}

function cloneRendererRoot(
  root: RendererRootLibraryTree,
  transientState: Map<string, TransientState> = new Map()
): RendererRootLibraryTree {
  const nextRoot: RendererRootLibraryTree = {
    id: root.id,
    children: []
  };
  const children = isEffectArray(root.children) ? root.children : [];
  nextRoot.children = children.map(child => cloneRendererNode(child, nextRoot, transientState));
  return nextRoot;
}

function cloneRendererNode(
  node: RendererLibraryTree,
  parent: RendererLibraryNode,
  transientState: Map<string, TransientState> = new Map()
): RendererLibraryTree {
  const nextNode = cloneRendererNodeWithoutChildren(node, parent, transientState);
  const children = isEffectArray(node.children) ? node.children : [];
  nextNode.children = children.map(child => cloneRendererNode(child, nextNode, transientState));
  return nextNode;
}

function cloneRendererNodeWithoutChildren(
  node: RendererLibraryTree,
  parent: RendererLibraryNode,
  transientState: Map<string, TransientState> = new Map()
): RendererLibraryTree {
  const transient = transientState.get(node.id);
  const nextNode: RendererLibraryTree = {
    ...node,
    parent,
    children: []
  };

  if (transient?.isChange !== undefined) {
    nextNode.isChange = transient.isChange;
  }

  if (transient?.isChange && transient.description !== undefined) {
    nextNode.description = transient.description;
  }

  return nextNode;
}

function findRendererTreeNodeById(node: RendererLibraryTree, id: string): RendererLibraryTree | null {
  if (node.id === id) {
    return node;
  }

  if (!isEffectArray(node.children)) {
    return null;
  }

  for (const child of node.children) {
    const target = findRendererTreeNodeById(child, id);
    if (target) {
      return target;
    }
  }

  return null;
}

function collectTransientState(root?: RendererRootLibraryTree): Map<string, TransientState> {
  const map = new Map<string, TransientState>();

  if (!root) {
    return map;
  }

  root.children.forEach(child => collectTransientNodeState(child, map));
  return map;
}

function collectTransientNodeState(node: RendererLibraryTree, map: Map<string, TransientState>): void {
  if (node.isChange !== undefined) {
    map.set(node.id, {
      isChange: node.isChange,
      description: node.description
    });
  }

  node.children.forEach(child => collectTransientNodeState(child, map));
}
