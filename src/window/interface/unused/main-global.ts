import { MainProcessConfig, NormalObject } from '_types';

/**
 * A Store interface, which to share variable between `main` process, used by inversifyJs
 *
 * @author crazycodegame
 */
interface MainGlobal {
  addConfig(config: Partial<MainProcessConfig>): void;

  getConfig<K extends keyof MainProcessConfig>(key: K): Partial<MainProcessConfig>[K];

  setConfig<T extends keyof MainProcessConfig>(key: T, value: MainProcessConfig[T]): void;

  setRenderConfig(config: NormalObject): void;

  getRenderConfig(): NormalObject;
}

export default MainGlobal;
