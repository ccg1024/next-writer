interface MessageListener {
  (data: unknown): void;
}
class MessagePublish {
  private message: Map<string, MessageListener[]>;
  private waittingTask: Promise<void>; // The micro task which is waitting for running
  private publishing: Map<string, unknown>; // The meesage that need to be pushed in current event loop
  constructor() {
    this.message = new Map();
    this.publishing = new Map();
  }

  sub(message: string, cb: MessageListener) {
    if (this.message.has(message)) {
      this.message.get(message).push(cb);
      return;
    }
    this.message.set(message, [cb]);
  }

  unsub(message: string, cb: MessageListener) {
    if (this.message.has(message)) {
      const listeners = this.message.get(message);
      this.message.set(
        message,
        listeners.filter(listener => listener !== cb)
      );
    }
  }

  pub(message: string, data?: unknown) {
    if (this.message.has(message)) {
      // Only effective for the last publish
      this.publishing.set(message, data);

      if (!this.waittingTask) {
        // Using micro task to resolve multi-publish during current event loop
        this.waittingTask = Promise.resolve().then(() => {
          for (const [message, data] of this.publishing) {
            this.message.get(message).forEach(listener => listener(data));
          }
          // Clear task
          this.waittingTask = void 0;
          this.publishing.clear();
        });
      }
    }
  }
}

const messagePublish = new MessagePublish();

export default messagePublish;
