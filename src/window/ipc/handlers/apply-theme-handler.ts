import { inject, injectable } from 'inversify';
import { ApplyThemeRequest } from '_types';
import type { ResolvedTheme } from 'src/theme/theme-contract';
import IIpcHandler from '../../interface/ipc-handler';
import IThemeService from '../../interface/theme-service';
import { TYPES } from '../../types';
import { IPC_CHANNEL } from '../ipc-contract';

@injectable()
class ApplyThemeHandler implements IIpcHandler<typeof IPC_CHANNEL.APPLY_THEME> {
  channel = IPC_CHANNEL.APPLY_THEME;

  constructor(@inject(TYPES.IThemeService) private themeService: IThemeService) {}

  async handle(data: ApplyThemeRequest): Promise<ResolvedTheme> {
    return this.themeService.applyTheme(data.themeId);
  }
}

export default ApplyThemeHandler;
