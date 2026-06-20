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
  INextIpcHandler: Symbol.for('INextIpcHandler'),
  IAppMenu: Symbol.for('IAppMenu'),
  IApplication: Symbol.for('IApplication'),
  IGlobalErrorReporter: Symbol.for('IGlobalErrorReporter'),
  IMainWindowFactory: Symbol.for('IMainWindowFactory'),
  IWindowCloseController: Symbol.for('IWindowCloseController'),
  IWindowCloseService: Symbol.for('IWindowCloseService'),
  IWindowRegistry: Symbol.for('IWindowRegistry'),
  IWindowSessionCoordinator: Symbol.for('IWindowSessionCoordinator'),
  IProtocolService: Symbol.for('IProtocolService'),
  IPathResolver: Symbol.for('IPathResolver'),
  IConfigService: Symbol.for('IConfigService'),
  IWorkspaceService: Symbol.for('IWorkspaceService'),
  ILibraryService: Symbol.for('ILibraryService'),
  IDocumentService: Symbol.for('IDocumentService'),
  IMenuActionService: Symbol.for('IMenuActionService'),
  ISenderValidator: Symbol.for('ISenderValidator')
};

export { TYPES };
