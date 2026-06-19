interface INextApp {
  createWindow(): Promise<void>;
  destroy(): void;
}

export default INextApp;
