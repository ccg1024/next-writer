type PluginState = {
  didMousePress: boolean;
  font: string;
};
class PluginGlobal {
  private static state: PluginState = {
    didMousePress: void 0,
    font: void 0
  };

  static get<K extends keyof PluginState>(key: K): PluginState[K] {
    return PluginGlobal.state[key];
  }

  static set<K extends keyof PluginState>(key: K, value: PluginState[K]) {
    PluginGlobal.state[key] = value;
  }
}

export default PluginGlobal;
