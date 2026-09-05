import { dialog } from 'electron';
import { inject, injectable } from 'inversify';
import { APP_PROMOT } from 'src/tools/config';
import IGlobalErrorReporter from '../interface/global-error-reporter';
import IAppLogger from '../interface/app-logger';
import { TYPES } from '../types';

@injectable()
class GlobalErrorReporter implements IGlobalErrorReporter {
  private listening = false;

  constructor(@inject(TYPES.IAppLogger) private appLogger: IAppLogger = { record: () => undefined }) {}

  listen(): void {
    if (this.listening) {
      return;
    }

    process.on('uncaughtException', error => {
      this.appLogger.record('process.uncaught-exception', 'failure', { error });
      dialog.showErrorBox('main process error', `${APP_PROMOT} ${error.message}`);
    });

    process.on('unhandledRejection', reject => {
      const msg =
        typeof reject === 'string' ? reject : reject instanceof Error ? reject.message : 'Unrecognized type of reject';
      this.appLogger.record('process.unhandled-rejection', 'failure', { error: reject });
      dialog.showErrorBox('main process promise reject', `${APP_PROMOT} ${msg}`);
    });

    this.listening = true;
  }
}

export default GlobalErrorReporter;
