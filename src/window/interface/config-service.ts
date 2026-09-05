import type { NormalObject } from '_types';

interface IConfigService {
  initConfig(configFilePath?: string): Promise<void>;
  patchConfig(patch: NormalObject): Promise<NormalObject>;
}

export default IConfigService;
