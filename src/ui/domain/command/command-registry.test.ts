/// <reference types="jest" />

import { CommandRegistry } from './command-registry';

describe('CommandRegistry', () => {
  it('registers, removes, and rejects duplicate command ids', () => {
    const registry = new CommandRegistry();
    const remove = registry.register(command('save', '保存文档'));
    expect(registry.list()).toHaveLength(1);
    expect(() => registry.register(command('save', '重复保存'))).toThrow('Duplicate command id: save');
    remove();
    expect(registry.list()).toHaveLength(0);
  });

  it('orders exact, prefix, substring and ordered-character matches', () => {
    const registry = new CommandRegistry();
    registry.register(command('ordered', '工人作业区域'));
    registry.register(command('substring', '同步工作区设置'));
    registry.register(command('prefix', '工作区搜索'));
    registry.register(command('exact', '工作区'));

    expect(registry.list('工作区').map(item => item.command.id)).toEqual(['exact', 'prefix', 'substring', 'ordered']);
  });

  it('orders equal scores by category and limits results to 100', () => {
    const registry = new CommandRegistry();
    registry.register({ ...command('theme', 'x theme'), category: 'theme' });
    registry.register({ ...command('document', 'x document'), category: 'document' });
    registry.register({ ...command('action', 'x action'), category: 'action' });
    expect(registry.list('x').map(item => item.command.id)).toEqual(['action', 'document', 'theme']);

    const largeRegistry = new CommandRegistry();
    for (let index = 0; index < 110; index += 1) largeRegistry.register(command(`item-${index}`, `x ${index}`));
    expect(largeRegistry.list('x')).toHaveLength(100);
  });

  it('returns disabled reasons and prevents concurrent execution', async () => {
    const registry = new CommandRegistry();
    let finish: () => void = () => undefined;
    const pending = new Promise<void>(resolve => {
      finish = resolve;
    });
    const execute = jest.fn(() => pending);
    registry.register({ ...command('disabled', '禁用'), availability: () => ({ enabled: false, reason: '未就绪' }) });
    registry.register({ ...command('async', '异步'), execute });

    expect(registry.list('禁用')[0].availability).toEqual({ enabled: false, reason: '未就绪' });
    const first = registry.execute('async');
    await expect(registry.execute('async')).resolves.toEqual({ success: false, message: '命令正在执行，请稍候' });
    expect(execute).toHaveBeenCalledTimes(1);
    finish();
    await expect(first).resolves.toEqual({ success: true });
  });

  it('normalizes execution failures for user feedback', async () => {
    const registry = new CommandRegistry();
    registry.register({ ...command('fail', '失败'), execute: () => Promise.reject(new Error('磁盘不可写')) });
    await expect(registry.execute('fail')).resolves.toEqual({ success: false, message: '磁盘不可写' });
  });

  it('filters 1,000 documents under the 50 ms P95 baseline', () => {
    const registry = new CommandRegistry();
    for (let index = 0; index < 1000; index += 1) {
      registry.register({
        ...command(`document-${index}`, `性能笔记 ${index}`),
        category: 'document',
        keywords: [`library/path/note-${index}`]
      });
    }
    const durations = Array.from({ length: 5 }, () => {
      const startedAt = performance.now();
      registry.list('性能 99');
      return performance.now() - startedAt;
    }).sort((left, right) => left - right);

    expect(durations[durations.length - 1]).toBeLessThan(50);
  });
});

function command(id: string, title: string) {
  return { id, title, category: 'action' as const, execute: jest.fn() };
}
