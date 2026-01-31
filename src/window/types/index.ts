/**
 * The types file used by inversifyJs
 *
 * @author crazycodegame
 */
const TYPES = {
  // rebuild
  INextFileSystem: Symbol.for('INextFileSystem'),
  INextStoreSystem: Symbol.for('INextStoreSystem'),
  INextCacheSystem: Symbol.for('INextCacheSystem'),
  INextIpcServer: Symbol.for('INextIpcServer'),
  INextMenu: Symbol.for('INextMenu'),
  INextApp: Symbol.for('INextApp')
};

export { TYPES };
