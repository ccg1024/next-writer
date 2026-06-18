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

export function isTrulyEmpty(val: unknown): val is null {
  return (val ?? '') === '' ? true : false;
}

export function removeEmpty(val: Record<string | symbol, unknown>) {
  if (isEffectObject(val)) {
    return Object.fromEntries(Object.entries(val).filter((_, value) => !isTrulyEmpty(value)));
  }
  return val;
}

export function getPromise<T>(): [Promise<T>, (value: T | PromiseLike<T>) => void, (reason?: unknown) => void] {
  let resolve, reject;
  const promise = new Promise<T>((resolve_, reject_) => {
    resolve = resolve_;
    reject = reject_;
  });

  return [promise, resolve, reject];
}
