import { inject, injectable } from 'inversify';
import { ReadConfigResponse } from '_types';
import IIpcHandler from '../../interface/ipc-handler';
import ILibraryTreeStore from '../../interface/library-tree-store';
import IRenderConfigStore from '../../interface/render-config-store';
import IThemeService from '../../interface/theme-service';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

/**
 * Reading renderer config and library tree data
 */
@injectable()
class ReadConfigHandler implements IIpcHandler<typeof IPC_CHANNEL.READ_CONFIG> {
  channel = IPC_CHANNEL.READ_CONFIG;

  constructor(
    @inject(TYPES.IRenderConfigStore) private renderConfigStore: IRenderConfigStore,
    @inject(TYPES.ILibraryTreeStore) private libraryTreeStore: ILibraryTreeStore,
    @inject(TYPES.IThemeService) private themeService: IThemeService
  ) {}

  async handle(): Promise<ReadConfigResponse> {
    const themeState = await this.themeService.getThemeState();

    return {
      config: this.renderConfigStore.getConfig(),
      libTree: this.libraryTreeStore.getTree(),
      themes: themeState.themes,
      activeTheme: themeState.activeTheme
    };
  }
}

export default ReadConfigHandler;
