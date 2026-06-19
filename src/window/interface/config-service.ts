interface IConfigService {
  initConfig(configFilePath?: string): Promise<void>;
}

export default IConfigService;
