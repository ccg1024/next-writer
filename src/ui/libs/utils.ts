export function reversePath(path: string, sep?: string) {
  const _sep = sep ? sep : '/'
  return path.split(_sep).reverse().join(_sep)
}
