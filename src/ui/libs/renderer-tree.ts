import { RendererLibraryTree } from '_types';
import { isEffectArray, isEffectObject, isTrulyEmpty } from 'src/tools/utils';
import { generateRuntimeInfo } from './utils';

export type RendererTreeOperation = 'append' | 'remove' | 'update';

export function refreshRendererTree(root: RendererLibraryTree): RendererLibraryTree {
  const nextRoot = cloneRendererNode(root, null);
  generateRuntimeInfo(nextRoot, null);
  return nextRoot;
}

export function updateRendererTree(
  root: RendererLibraryTree,
  target: RendererLibraryTree,
  operation: RendererTreeOperation
): RendererLibraryTree {
  if (!isEffectObject(root) || !isEffectObject(target)) {
    return root;
  }

  const nextRoot = applyRendererTreeOperation(root, target, operation, null);
  generateRuntimeInfo(nextRoot, null);
  return nextRoot;
}

export function findRendererNodeById(root: RendererLibraryTree, id?: string): RendererLibraryTree | null {
  if (isTrulyEmpty(id) || !isEffectObject(root)) {
    return null;
  }

  if (root.id === id) {
    return root;
  }

  if (!isEffectArray(root.children)) {
    return null;
  }

  for (const child of root.children) {
    const target = findRendererNodeById(child, id);
    if (target) {
      return target;
    }
  }

  return null;
}

function applyRendererTreeOperation(
  node: RendererLibraryTree,
  target: RendererLibraryTree,
  operation: RendererTreeOperation,
  parent: RendererLibraryTree | null
): RendererLibraryTree {
  const source = operation === 'update' && node.id === target.id ? target : node;
  const nextNode = cloneRendererNodeWithoutChildren(source, parent);
  const sourceChildren = isEffectArray(source.children) ? source.children : [];
  const nextChildren = sourceChildren.reduce<RendererLibraryTree[]>((children, child) => {
    if (operation === 'remove' && child.id === target.id) {
      return children;
    }
    children.push(applyRendererTreeOperation(child, target, operation, nextNode));
    return children;
  }, []);

  if (operation === 'append' && node.id === target.parent?.id) {
    nextChildren.push(cloneRendererNode(target, nextNode));
  }

  nextNode.children = nextChildren;
  return nextNode;
}

function cloneRendererNode(node: RendererLibraryTree, parent: RendererLibraryTree | null): RendererLibraryTree {
  const nextNode = cloneRendererNodeWithoutChildren(node, parent);
  const children = isEffectArray(node.children) ? node.children : [];
  nextNode.children = children.map(child => cloneRendererNode(child, nextNode));
  return nextNode;
}

function cloneRendererNodeWithoutChildren(
  node: RendererLibraryTree,
  parent: RendererLibraryTree | null
): RendererLibraryTree {
  return {
    ...node,
    parent: parent || undefined,
    relativePath: parent ? `${parent.relativePath}/${node.name}` : node.relativePath || '.',
    children: []
  };
}
