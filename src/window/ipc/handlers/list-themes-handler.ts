import { inject, injectable } from 'inversify';
import { ThemeStateResponse } from '_types';
import IIpcHandler from '../../interface/ipc-handler';
import IThemeService from '../../interface/theme-service';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class ListThemesHandler implements IIpcHandler<typeof IPC_CHANNEL.LIST_THEMES> {
  channel = IPC_CHANNEL.LIST_THEMES;

  constructor(@inject(TYPES.IThemeService) private themeService: IThemeService) {}

  async handle(): Promise<ThemeStateResponse> {
    return this.themeService.getThemeState();
  }
}

export default ListThemesHandler;
