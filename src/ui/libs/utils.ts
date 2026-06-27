import { isEffectArray, isEffectObject } from 'src/tools/utils';
import { RendererLibraryNode, RendererLibraryTree } from '_types';

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
export function generateRuntimeInfo(libTree: RendererLibraryNode, parent: RendererLibraryNode | null) {
  if (isEffectObject(libTree)) {
    if ('name' in libTree) {
      libTree.parent = parent;
    }

    if (isEffectArray<RendererLibraryTree>(libTree.children)) {
      libTree.children.forEach(child => generateRuntimeInfo(child, libTree));
    }
  }
}
