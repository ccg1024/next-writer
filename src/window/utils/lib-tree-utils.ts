import nodePath from 'path';
import { isTrulyEmpty } from 'src/tools/utils';
import { ROOT_CONFIG_NAME } from 'src/config/env';
import { LibraryTree } from '_types';
import IFileSystem from '../interface/file-system';
import IRuntimeConfigStore from '../interface/runtime-config-store';

/**
 * 库树工具函数
 *
 * ## 路径操作最佳实践
 *
 * ### 推荐做法（不修改原数组）
 * ```ts
 * const pathInfo = parsePathInfo(path, rootDir, fileSys);
 * const targetName = getTargetName(pathInfo.pathToken);
 * const parentTokens = getParentPathTokens(pathInfo.pathToken);
 * const parentLib = findParentLibNode(libTree, parentTokens);
 * // pathInfo.pathToken 仍然保持完整 ✅
 * ```
 *
 * ### 当前做法（有副作用，但仍然有效）
 * ```ts
 * const pathInfo = parsePathInfo(path, rootDir, fileSys);
 * const targetName = pathInfo.pathToken.pop(); // ⚠️ 原数组被修改
 * const parentLib = findParentLibNode(libTree, pathInfo.pathToken);
 * // pathInfo.pathToken 已不包含目标名称
 * // 后续不应再访问 pathInfo.pathToken
 * ```
 */

/**
 * 路径解析结果
 *
 * ⚠️ 重要提示：pathToken 数组在使用时可能被修改
 * - 如果使用 `pop()` 提取目标名称，原数组将不包含目标名称
 * - 推荐使用 extractTargetAndParent() 或 getTargetName() 等辅助函数
 * - 或者使用 [...pathToken].pop() 创建副本后再操作
 */
export interface PathInfo {
  relativePath: string;
  fullPath: string;
  /** 路径标记数组（完整路径），例如：['folder1', 'folder2', 'file'] */
  pathToken: string[];
}

/**
 * 解析路径信息
 * @param path - 相对或绝对路径
 * @param rootDir - 根目录
 * @param fileSys - 文件系统实例
 * @param options - 可选配置
 * @returns 路径信息，解析失败返回 null
 */
export function parsePathInfo(
  path: string,
  rootDir: string,
  fileSys: IFileSystem,
  options?: { suffix?: string }
): PathInfo | null {
  const formatPath = fileSys.formatPath(path);
  if (isTrulyEmpty(formatPath)) {
    return null;
  }

  const relativePath = formatPath.startsWith(rootDir) ? formatPath.substring(rootDir.length) : formatPath.substring(2);

  const fullPath = options?.suffix
    ? nodePath.join(rootDir, relativePath + options.suffix)
    : nodePath.join(rootDir, relativePath);

  const pathToken = relativePath.split('/').filter(token => !!token);

  return { relativePath, fullPath, pathToken };
}

/**
 * 在库树中查找父级节点
 * @param libTree - 库树根节点
 * @param pathTokens - 路径标记数组（不包含目标名称）
 * @returns 父级节点，未找到返回 undefined
 */
export function findParentLibNode(libTree: LibraryTree, pathTokens: string[]): LibraryTree | undefined {
  let parentLib = libTree;
  for (let i = 0; i < pathTokens.length; i += 1) {
    if (!parentLib) break;
    parentLib = parentLib.children.find(lib => lib.name === pathTokens[i] && lib.type === 'folder');
  }
  return parentLib;
}

/**
 * 持久化库树到配置文件和 store
 * @param libTree - 库树根节点
 * @param rootDir - 根目录
 * @param store - Store 实例
 * @param fileSys - 文件系统实例
 */
export async function persistLibTree(
  libTree: LibraryTree,
  rootDir: string,
  store: IRuntimeConfigStore,
  fileSys: IFileSystem
): Promise<void> {
  await fileSys.writeFile(nodePath.join(rootDir, ROOT_CONFIG_NAME), JSON.stringify(libTree, null, 2));
  store.setConfig('libraryTree', libTree);
}

/**
 * 从路径标记数组中提取目标名称和父级路径标记
 * ⚠️ 副作用警告：此函数会修改原始数组！
 *
 * @param pathTokens - 路径标记数组
 * @param options - 可选配置
 * @returns 目标名称和父级路径标记
 *
 * @example
 * ```ts
 * const tokens = ['folder1', 'folder2', 'myfile'];
 * const { targetName, parentPathTokens } = extractTargetAndParent(tokens);
 * // targetName: 'myfile'
 * // parentPathTokens: ['folder1', 'folder2']
 * // tokens: ['folder1', 'folder2'] ⚠️ 原数组被修改
 * ```
 */
export function extractTargetAndParent(
  pathTokens: string[],
  options?: { stripExtension?: boolean }
): { targetName: string; parentPathTokens: string[] } {
  const popped = pathTokens.pop();
  if (popped === undefined) {
    throw new Error('Cannot extract target name from empty path tokens');
  }

  const targetName = options?.stripExtension ? popped.replace(/\.[^.]+$/, '') : popped;

  return {
    targetName,
    parentPathTokens: pathTokens
  };
}

/**
 * 安全地从路径标记数组中提取目标名称（不修改原数组）
 *
 * @param pathTokens - 路径标记数组
 * @param options - 可选配置
 * @returns 目标名称
 *
 * @example
 * ```ts
 * const tokens = ['folder1', 'folder2', 'myfile'];
 * const targetName = getTargetName(tokens);
 * // targetName: 'myfile'
 * // tokens: ['folder1', 'folder2', 'myfile'] ✅ 原数组不变
 * ```
 */
export function getTargetName(pathTokens: string[], options?: { stripExtension?: boolean }): string {
  const lastName = pathTokens[pathTokens.length - 1];
  return options?.stripExtension ? lastName.replace(/\.[^.]+$/, '') : lastName;
}

/**
 * 获取父级路径标记（不修改原数组）
 *
 * @param pathTokens - 路径标记数组
 * @returns 父级路径标记数组
 *
 * @example
 * ```ts
 * const tokens = ['folder1', 'folder2', 'myfile'];
 * const parentTokens = getParentPathTokens(tokens);
 * // parentTokens: ['folder1', 'folder2']
 * // tokens: ['folder1', 'folder2', 'myfile'] ✅ 原数组不变
 * ```
 */
export function getParentPathTokens(pathTokens: string[]): string[] {
  return pathTokens.slice(0, -1);
}
