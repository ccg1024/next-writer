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
export function isEffectObject<T extends NormalObject>(obj: unknown): obj is T {
  if (Object.prototype.toString.call(obj) === '[object Object]') {
    if (Object.keys(obj).length > 0) {
      return true;
    }
  }
  return false;
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
