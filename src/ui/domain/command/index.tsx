import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import type { AppCommand, CommandExecutionResult } from './command-registry';
import { CommandRegistry } from './command-registry';

type CommandContextValue = {
  registry: CommandRegistry;
  revision: number;
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  execute: (id: string) => Promise<CommandExecutionResult>;
};

const CommandContext = createContext<CommandContextValue | null>(null);

export function CommandProvider({ children }: React.PropsWithChildren) {
  const registryRef = useRef<CommandRegistry>();
  if (!registryRef.current) registryRef.current = new CommandRegistry();
  const registry = registryRef.current;
  const [revision, setRevision] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useLayoutEffect(() => registry.subscribe(() => setRevision(value => value + 1)), [registry]);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const execute = useCallback((id: string) => registry.execute(id), [registry]);
  const value = useMemo(
    () => ({ registry, revision, paletteOpen, openPalette, closePalette, execute }),
    [closePalette, execute, openPalette, paletteOpen, registry, revision]
  );
  return <CommandContext.Provider value={value}>{children}</CommandContext.Provider>;
}

export function useCommandRegistry() {
  const value = useContext(CommandContext);
  if (!value) throw new Error('useCommandRegistry must be used within CommandProvider');
  return value;
}

/** 组件只注册自己拥有的行为，卸载时自动从目录移除。 */
export function useRegisterCommand(command: AppCommand) {
  const { registry } = useCommandRegistry();
  const commandRef = useRef(command);
  commandRef.current = command;

  const signature = getCommandSignature(command);
  useEffect(
    () =>
      registry.register({
        ...commandRef.current,
        availability: () => commandRef.current.availability?.() ?? { enabled: true },
        execute: () => commandRef.current.execute()
      }),
    [registry, signature]
  );
}

export function useRegisterCommands(commands: AppCommand[]) {
  const { registry } = useCommandRegistry();
  const commandsRef = useRef(commands);
  commandsRef.current = commands;
  const signature = commands.map(getCommandSignature).join('\n');

  useEffect(() => {
    const removers = commandsRef.current.map(command =>
      registry.register({
        ...command,
        availability: () =>
          commandsRef.current.find(current => current.id === command.id)?.availability?.() ?? { enabled: true },
        execute: () => commandsRef.current.find(current => current.id === command.id)?.execute()
      })
    );
    return () => removers.forEach(remove => remove());
  }, [registry, signature]);
}

function getCommandSignature(command: AppCommand): string {
  return JSON.stringify([
    command.id,
    command.title,
    command.category,
    command.keywords,
    command.shortcut,
    command.showWhenEmpty,
    command.order
  ]);
}

export type { AppCommand, CommandAvailability, RankedCommand } from './command-registry';
