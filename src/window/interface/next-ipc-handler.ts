interface INextIpcHandler {
  type: string;
  /**
   * Invoke when get ipc request.
   * Handler should return business data directly or throw Error on failure.
   * Response wrapping is handled by NextIpcServer.
   */
  apply(type: string, data?: unknown): Promise<unknown>;
}

export default INextIpcHandler;
