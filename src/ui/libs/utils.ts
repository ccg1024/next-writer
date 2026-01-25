import { isEffectArray, isEffectObject, isTrulyEmpty } from 'src/tools/utils';
import { RendererLibraryTree } from '_types';

export const throttle = function <T extends unknown[]>(fn: (...args: T) => void, delay = 1000) {
  let timer: NodeJS.Timeout = null;
  return function (...args: T) {
    if (timer) return;

    timer = setTimeout(() => {
      fn.call(this, ...args);
      timer = null;
    }, delay);
  };
};

// Mock a unique id
export function generateUniqueId(slate: string) {
  return `${Math.random().toString(36).substring(2, 15)}_${new Date().valueOf().toString(36)}_${slate || ''}`;
}

/**
 * Make a debounce function.
 * Can be optimized using requestAnimationFrame.
 */
export function debounceFn<F extends (...args: unknown[]) => unknown>(fn: F, delay = 500) {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<typeof fn>) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * Generate a unique id for each lib struct (description of the file or folder) at runtime
 */
export function generateRuntimeInfo(libTree: RendererLibraryTree, parent: RendererLibraryTree | null) {
  if (isEffectObject(libTree)) {
    // The first level of LibraryTree struct is point to root folder,
    // for example, the default root is ~/Documents/nwriter/
    // the libTree is generated as {children: [{name: 'custom-folder-name'}]}
    if (isTrulyEmpty(libTree.relativePath)) {
      libTree.relativePath = parent ? `${parent.relativePath}/${libTree.name}` : `.`;
    }

    if (isTrulyEmpty(libTree.parent)) {
      libTree.parent = parent;
    }

    if (isTrulyEmpty(libTree.id)) {
      libTree.id = generateUniqueId(libTree.relativePath);
    }

    if (isEffectArray(libTree.children)) {
      libTree.children.forEach(child => generateRuntimeInfo(child, libTree));
    }
  }
}
