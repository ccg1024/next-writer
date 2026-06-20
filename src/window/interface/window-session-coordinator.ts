interface IWindowSessionCoordinator {
  createWindow(): Promise<void>;
  destroy(): void;
}

export default IWindowSessionCoordinator;
