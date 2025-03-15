import { NormalObject } from '_types';

/**
 * Whether a variable is an Array instance and has at least one element.
 */
export function isEffectArray<T>(arr: T[]): arr is T[] {
  if (arr && Array.isArray(arr) && arr.length > 0) {
    return true;
  }
  return false;
}

/**
 * Whether a variable is an Object instance and has at least one key-value
 */
export function isEffectObject<T extends NormalObject>(obj: T): obj is T {
  if (Object.prototype.toString.call(obj) === '[object Object]') {
    if (Object.keys(obj).length > 0) {
      return true;
    }
  }
  return false;
}

type TrulyEmpty = null | undefined | '';

export function isTrulyEmpty(val: unknown): val is TrulyEmpty {
  return (val ?? '') === '' ? true : false;
}

export function removeEmpty(val: Record<string | symbol, unknown>) {
  if (isEffectObject(val)) {
    return Object.fromEntries(Object.entries(val).filter((_, value) => !isTrulyEmpty(value)));
  }
  return val;
}

type NormalTree = {
  children?: NormalTree[];
};
/**
 * Recursive processing of tree structed data
 */
export function operateTree(tree: NormalTree, locate: (tree: NormalTree) => boolean, operate: 'remove' | 'change') {
  // Stop process if tree is not an valid object
  if (!isEffectObject(tree)) {
    return;
  }
  // process current tree
  if (operate !== 'remove' && locate(tree)) {
    // ...
  }

  // Recursive processing sub-tree
  if (isEffectArray(tree.children)) {
    let stopFilter = false;
    if (operate === 'remove') {
      tree.children = tree.children.filter(subTree => {
        if (locate(subTree)) {
          stopFilter = true;
          return false;
        }
        return true;
      });
    }
    if (!stopFilter) {
      tree.children.forEach(subTree => operateTree(subTree, locate, operate));
    }
  }
}

/**
 * Normalize error output
 */
export function normalizeError(err: string | NormalObject) {
  return `[next-writer] ${typeof err === 'string' ? err : err?.message}`;
}

export function isString(str: unknown): str is string {
  if (typeof str === 'string') return true;
  return false;
}
