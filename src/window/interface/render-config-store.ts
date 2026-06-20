import type { NormalObject } from '_types';

interface IRenderConfigStore {
  setConfig(config: NormalObject): void;
  getConfig(): NormalObject;
}

export default IRenderConfigStore;
