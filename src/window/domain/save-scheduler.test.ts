/// <reference types="jest" />

import 'reflect-metadata';
import SaveScheduler from './save-scheduler';

describe('SaveScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('debounces automatic saves and keeps only the newest task', async () => {
    const scheduler = new SaveScheduler();
    const writes: string[] = [];
    scheduler.schedule('note', 1000, async () => {
      writes.push('old');
    });
    scheduler.schedule('note', 1000, async () => {
      writes.push('new');
    });

    await jest.advanceTimersByTimeAsync(1000);

    expect(writes).toEqual(['new']);
  });

  it('serializes immediate saves for the same document', async () => {
    const scheduler = new SaveScheduler();
    const writes: string[] = [];
    let releaseFirst: () => void = () => undefined;
    const firstGate = new Promise<void>(resolve => {
      releaseFirst = resolve;
    });
    const first = scheduler.enqueue('note', async () => {
      await firstGate;
      writes.push('first');
    });
    const second = scheduler.enqueue('note', async () => {
      writes.push('second');
    });

    await Promise.resolve();
    expect(writes).toEqual([]);
    releaseFirst();
    await Promise.all([first, second]);

    expect(writes).toEqual(['first', 'second']);
  });

  it('reports a flush timeout without discarding the running save', async () => {
    const scheduler = new SaveScheduler();
    scheduler.enqueue('note', () => new Promise<void>(() => undefined));

    const result = scheduler.flushAll(100);
    await jest.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toBe(false);
  });

  it('continues with a newer save after an earlier save fails', async () => {
    const scheduler = new SaveScheduler();
    const writes: string[] = [];
    const failed = scheduler.enqueue('note', async () => {
      throw new Error('disk unavailable');
    });
    const retried = scheduler.enqueue('note', async () => {
      writes.push('retried');
    });

    await expect(failed).rejects.toThrow('disk unavailable');
    await expect(retried).resolves.toBeUndefined();
    expect(writes).toEqual(['retried']);
  });
});
