type PluginState = {
  didMousePress: boolean;
};
class PluginGlobal {
  private static state: PluginState = {
    didMousePress: void 0
  };

  static get(key: keyof PluginState) {
    return PluginGlobal.state[key];
  }

  static set<K extends keyof PluginState>(key: K, value: PluginState[K]) {
    PluginGlobal.state[key] = value;
  }
}

export default PluginGlobal;
