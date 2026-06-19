import { dialog } from 'electron';
import { injectable } from 'inversify';
import { APP_PROMOT } from 'src/tools/config';
import IGlobalErrorReporter from '../interface/global-error-reporter';

@injectable()
class GlobalErrorReporter implements IGlobalErrorReporter {
  private listening = false;

  listen(): void {
    if (this.listening) {
      return;
    }

    process.on('uncaughtException', error => {
      dialog.showErrorBox('main process error', `${APP_PROMOT} ${error.message}`);
    });

    process.on('unhandledRejection', reject => {
      const msg =
        typeof reject === 'string' ? reject : reject instanceof Error ? reject.message : 'Unrecognized type of reject';
      dialog.showErrorBox('main process promise reject', `${APP_PROMOT} ${msg}`);
    });

    this.listening = true;
  }
}

export default GlobalErrorReporter;
