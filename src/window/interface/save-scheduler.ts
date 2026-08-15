export type SaveTask = () => Promise<void>;

interface ISaveScheduler {
  schedule(id: string, delayMs: number, task: SaveTask): void;
  enqueue(id: string, task: SaveTask): Promise<void>;
  flush(id: string): Promise<void>;
  cancel(id: string): void;
  flushAll(timeoutMs: number): Promise<boolean>;
  destroy(): void;
}

export default ISaveScheduler;
