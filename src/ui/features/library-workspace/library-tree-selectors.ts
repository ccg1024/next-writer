import type { RendererLibraryTree, RendererRootLibraryTree } from '_types';
import { isEffectArray } from 'src/tools/utils';

export function findLibraryNodeByIdPath(ids: string[], tree: RendererRootLibraryTree): RendererLibraryTree | undefined {
  if (!isEffectArray(ids) || !tree) {
    return void 0;
  }

  let children = tree.children;
  let target: RendererLibraryTree | undefined;
  const tempIds = [...ids];
  while (tempIds.length > 0) {
    const id = tempIds.shift();
    target = children?.find(child => child.id === id);
    if (!target) {
      return void 0;
    }
    children = target.children;
  }

  return target;
}
