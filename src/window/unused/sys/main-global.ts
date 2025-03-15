import { isEffectObject } from 'src/tools/utils';
import { MainProcessConfig, NormalObject } from '_types';

/**
 * Store shared variable between `main` process or some default config of next-writer
 *
 * @author crazycodegame
 *
 */
class MainGlobal {
  private __config: Partial<MainProcessConfig>;
  private __renderConfig: NormalObject;
  constructor() {
    this.__config = {
      configName: 'nwriter.json',
      logName: 'nwriter.log'
    };
    this.__renderConfig = {};
  }

  addConfig(config: Partial<MainProcessConfig>) {
    if (isEffectObject(config)) {
      this.__config = { ...this.__config, ...config };
    }
  }

  getConfig<K extends keyof MainProcessConfig>(key: K) {
    return this.__config[key];
  }

  setConfig<T extends keyof MainProcessConfig>(key: T, value: MainProcessConfig[T]) {
    if (key) {
      this.__config[key] = value;
    }
  }

  setRenderConfig(config: NormalObject) {
    if (isEffectObject(config)) {
      this.__renderConfig = config;
    }
  }

  getRenderConfig() {
    return JSON.parse(JSON.stringify(this.__renderConfig));
  }
}

export default MainGlobal;
