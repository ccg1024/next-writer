import { injectable } from 'inversify';
import type { NormalObject } from '_types';
import IRenderConfigStore from '../interface/render-config-store';

@injectable()
class RenderConfigStore implements IRenderConfigStore {
  private config: NormalObject = {};

  setConfig(config: NormalObject): void {
    this.config = { ...(config ?? {}) };
  }

  getConfig(): NormalObject {
    return { ...(this.config ?? {}) };
  }
}

export default RenderConfigStore;
