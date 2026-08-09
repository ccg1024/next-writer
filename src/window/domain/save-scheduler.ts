import { injectable } from 'inversify';
import ISaveScheduler, { SaveTask } from '../interface/save-scheduler';

type SaveQueueEntry = {
  pending?: SaveTask;
  running?: Promise<void>;
  timer?: ReturnType<typeof setTimeout>;
};

@injectable()
/** 按文档串行执行并合并保存请求，保证同一文档的较新内容最后落盘。 */
class SaveScheduler implements ISaveScheduler {
  private readonly entries = new Map<string, SaveQueueEntry>();

  schedule(id: string, delayMs: number, task: SaveTask): void {
    const entry = this.getEntry(id);
    entry.pending = task;
    if (entry.timer) {
      clearTimeout(entry.timer);
    }
    entry.timer = setTimeout(() => {
      entry.timer = undefined;
      void this.flush(id).catch(() => undefined);
    }, delayMs);
  }

  enqueue(id: string, task: SaveTask): Promise<void> {
    const entry = this.getEntry(id);
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = undefined;
    }
    entry.pending = undefined;
    const taskPromise = (entry.running ?? Promise.resolve()).catch(() => undefined).then(task);
    const runningPromise = taskPromise
      .catch(() => undefined)
      .finally(() => {
        if (entry.running === runningPromise) {
          this.cleanupEntry(id, entry);
        }
      });
    entry.running = runningPromise;
    return taskPromise;
  }

  async flush(id: string): Promise<void> {
    const entry = this.entries.get(id);
    if (!entry) {
      return;
    }
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = undefined;
    }
    if (entry.pending) {
      const task = entry.pending;
      entry.pending = undefined;
      await this.enqueue(id, task);
      return;
    }
    await entry.running;
  }

  async flushAll(timeoutMs: number): Promise<boolean> {
    const flushPromise = Promise.all(Array.from(this.entries.keys(), id => this.flush(id))).then(() => true);
    let timeout: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<false>(resolve => {
      timeout = setTimeout(() => resolve(false), timeoutMs);
    });
    try {
      return await Promise.race([flushPromise, timeoutPromise]);
    } finally {
      clearTimeout(timeout);
    }
  }

  destroy(): void {
    this.entries.forEach(entry => {
      if (entry.timer) {
        clearTimeout(entry.timer);
      }
    });
    this.entries.clear();
  }

  private getEntry(id: string): SaveQueueEntry {
    const entry = this.entries.get(id) ?? {};
    this.entries.set(id, entry);
    return entry;
  }

  private cleanupEntry(id: string, entry: SaveQueueEntry): void {
    entry.running = undefined;
    if (entry.pending && !entry.timer) {
      void this.enqueue(id, entry.pending).catch(() => undefined);
      return;
    }
    if (!entry.pending && !entry.timer) {
      this.entries.delete(id);
    }
  }
}

export default SaveScheduler;
