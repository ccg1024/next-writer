export type CommandCategory = 'action' | 'recent-document' | 'document' | 'theme';

export type CommandAvailability = {
  enabled: boolean;
  reason?: string;
};

export type AppCommand = {
  id: string;
  title: string;
  category: CommandCategory;
  keywords?: string[];
  shortcut?: string;
  showWhenEmpty?: boolean;
  order?: number;
  availability?: () => CommandAvailability;
  execute: () => void | Promise<void>;
};

export type CommandExecutionResult = { success: true } | { success: false; message: string };

export type RankedCommand = {
  command: AppCommand;
  availability: CommandAvailability;
};

const CATEGORY_ORDER: Record<CommandCategory, number> = {
  action: 0,
  'recent-document': 1,
  document: 2,
  theme: 3
};

/** Renderer 中唯一的命令目录；只负责编目、过滤与互斥执行，不持有领域行为。 */
export class CommandRegistry {
  private commands = new Map<string, AppCommand>();
  private listeners = new Set<() => void>();
  private executing = new Set<string>();

  register(command: AppCommand): () => void {
    if (this.commands.has(command.id)) {
      throw new Error(`Duplicate command id: ${command.id}`);
    }
    this.commands.set(command.id, command);
    this.emit();
    return () => {
      if (this.commands.get(command.id) === command) {
        this.commands.delete(command.id);
        this.emit();
      }
    };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  list(query = '', limit = 100): RankedCommand[] {
    const normalized = normalize(query);
    return Array.from(this.commands.values())
      .map(command => ({
        command,
        score: !normalized && command.showWhenEmpty === false ? -1 : matchCommand(command, normalized)
      }))
      .filter(item => item.score >= 0)
      .sort(
        (left, right) =>
          right.score - left.score ||
          CATEGORY_ORDER[left.command.category] - CATEGORY_ORDER[right.command.category] ||
          (left.command.order ?? Number.MAX_SAFE_INTEGER) - (right.command.order ?? Number.MAX_SAFE_INTEGER) ||
          left.command.title.localeCompare(right.command.title)
      )
      .slice(0, Math.max(0, limit))
      .map(({ command }) => ({
        command,
        availability: command.availability?.() ?? { enabled: true }
      }));
  }

  async execute(id: string): Promise<CommandExecutionResult> {
    const command = this.commands.get(id);
    if (!command) {
      return { success: false, message: '命令不存在或已失效' };
    }
    const availability = command.availability?.() ?? { enabled: true };
    if (!availability.enabled) {
      return { success: false, message: availability.reason || '当前无法执行此命令' };
    }
    if (this.executing.has(id)) {
      return { success: false, message: '命令正在执行，请稍候' };
    }

    this.executing.add(id);
    this.emit();
    try {
      await command.execute();
      return { success: true };
    } catch (error) {
      return { success: false, message: normalizeError(error) };
    } finally {
      this.executing.delete(id);
      this.emit();
    }
  }

  isExecuting(id: string): boolean {
    return this.executing.has(id);
  }

  private emit(): void {
    this.listeners.forEach(listener => listener());
  }
}

export function matchText(value: string, query: string): number {
  const target = normalize(value);
  if (!query) return 0;
  if (target === query) return 400;
  if (target.startsWith(query)) return 300;
  const substringIndex = target.indexOf(query);
  if (substringIndex >= 0) return 200;

  let targetIndex = 0;
  for (const character of query) {
    const found = target.indexOf(character, targetIndex);
    if (found < 0) return -1;
    targetIndex = found + 1;
  }
  return 100;
}

function matchCommand(command: AppCommand, query: string): number {
  if (!query) return 0;
  return Math.max(matchText(command.title, query), ...(command.keywords ?? []).map(value => matchText(value, query)));
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function normalizeError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return '命令执行失败，请重试';
}
