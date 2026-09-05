import { useCallback, useEffect, useMemo, useState } from 'react';
import { App } from 'antd';
import type { RendererLibraryTree, WorkspaceMetadata } from '_types';
import { useCommandRegistry, useRegisterCommand, useRegisterCommands } from 'src/ui/domain/command';
import { useLibraryActions, useLibraryState } from 'src/ui/domain/library';
import { useRuntimeLayout } from 'src/ui/domain/runtime';
import { useAppTheme } from 'src/ui/domain/theme';
import rendererGateway from 'src/ui/shared/ipc/renderer-gateway';

type DocumentEntry = { node: RendererLibraryTree; path: string };

/** 注册跨域组合命令；每个 execute 仍调用对应 Context 或 renderer gateway。 */
export function CommandContributions(): JSX.Element {
  const { message } = App.useApp();
  const { paletteOpen, openPalette } = useCommandRegistry();
  const { libraryTree, currentNote } = useLibraryState();
  const { setCurrentLib, setCurrentNote, setLibraryTree } = useLibraryActions();
  const { runtimeConfig, setRuntimeConfig } = useRuntimeLayout();
  const { activeTheme, themes, applyThemeById } = useAppTheme();
  const [metadata, setMetadata] = useState<WorkspaceMetadata | null>(null);
  const documents = useMemo(() => collectDocuments(libraryTree), [libraryTree]);

  const refreshMetadata = useCallback(async () => {
    const response = await rendererGateway.getWorkspaceMetadata();
    if (response.status === 0) setMetadata(response.data);
  }, []);

  useEffect(() => {
    if (paletteOpen) void refreshMetadata();
  }, [paletteOpen, refreshMetadata]);

  const openDocument = useCallback(
    (node: RendererLibraryTree) => {
      if (node.parent && 'type' in node.parent) setCurrentLib(node.parent);
      setCurrentNote(node);
    },
    [setCurrentLib, setCurrentNote]
  );

  useRegisterCommand({
    id: 'command.palette.open',
    title: '打开命令面板',
    category: 'action',
    keywords: ['command palette', '命令'],
    shortcut: 'Cmd/Ctrl+Shift+P',
    execute: openPalette
  });

  useRegisterCommand({
    id: 'runtime.auto-save.toggle',
    title: runtimeConfig?.autoSave.enabled ? '关闭自动保存' : '开启自动保存',
    category: 'action',
    keywords: ['自动保存', 'auto save'],
    availability: () => ({ enabled: Boolean(runtimeConfig), reason: runtimeConfig ? undefined : '运行配置未就绪' }),
    execute: async () => {
      const response = await rendererGateway.updateRuntimePreference({
        preference: 'autoSave.enabled',
        value: !runtimeConfig.autoSave.enabled
      });
      if (response.status !== 0) throw new Error(response.message || '更新自动保存失败');
      setRuntimeConfig(response.data);
    }
  });

  useRegisterCommand({
    id: 'runtime.typewriter.toggle',
    title: runtimeConfig?.menuStatus.typewriterMode ? '关闭打字机模式' : '开启打字机模式',
    category: 'action',
    keywords: ['打字机', 'typewriter'],
    availability: () => ({ enabled: Boolean(runtimeConfig), reason: runtimeConfig ? undefined : '运行配置未就绪' }),
    execute: async () => {
      const response = await rendererGateway.updateRuntimePreference({
        preference: 'typewriterMode',
        value: !runtimeConfig.menuStatus.typewriterMode
      });
      if (response.status !== 0) throw new Error(response.message || '更新打字机模式失败');
      setRuntimeConfig(response.data);
    }
  });

  useRegisterCommand({
    id: 'document.favorite.toggle',
    title: currentNote?.id && metadata?.favoriteIds.includes(currentNote.id) ? '取消收藏当前文档' : '收藏当前文档',
    category: 'action',
    keywords: ['收藏', 'favorite'],
    availability: () => ({ enabled: Boolean(currentNote), reason: currentNote ? undefined : '没有当前文档' }),
    execute: async () => {
      const response = await rendererGateway.updateWorkspaceMetadata({
        action: 'set-favorite',
        id: currentNote.id,
        value: !metadata?.favoriteIds.includes(currentNote.id)
      });
      if (response.status !== 0) throw new Error(response.message || '更新收藏失败');
      setMetadata(response.data);
    }
  });

  useRegisterCommand({
    id: 'workspace.synchronize',
    title: '同步工作区',
    category: 'action',
    keywords: ['同步文库', '刷新工作区', 'sync'],
    execute: async () => {
      const response = await rendererGateway.synchronizeWorkspace();
      if (response.status !== 0) throw new Error(response.message || '同步工作区失败');
      setLibraryTree(response.data);
      message.success('工作区已同步');
    }
  });

  const recentIds = new Set((metadata?.recent ?? []).slice(0, 10).map(item => item.id));
  const recentOrder = new Map((metadata?.recent ?? []).slice(0, 10).map((item, index) => [item.id, index]));
  const documentCommands = documents.map(({ node, path }) => ({
    id: `document.open.${node.id}`,
    title: node.name,
    category: recentIds.has(node.id) ? ('recent-document' as const) : ('document' as const),
    keywords: [path, '打开文档', 'quick open'],
    showWhenEmpty: recentIds.has(node.id),
    order: recentOrder.get(node.id),
    execute: () => openDocument(node)
  }));
  const themeCommands = themes.map(theme => ({
    id: `theme.apply.${theme.id}`,
    title: theme.name,
    category: 'theme' as const,
    keywords: ['主题', 'theme', theme.id],
    showWhenEmpty: false,
    availability: () => ({
      enabled: theme.id !== activeTheme.id,
      reason: theme.id === activeTheme.id ? '当前主题' : undefined
    }),
    execute: () => applyThemeById(theme.id)
  }));
  useRegisterCommands([...documentCommands, ...themeCommands]);

  return null;
}

function collectDocuments(root: ReturnType<typeof useLibraryState>['libraryTree']): DocumentEntry[] {
  const result: DocumentEntry[] = [];
  const visit = (node: RendererLibraryTree, parents: string[]) => {
    const path = [...parents, node.name].join('/');
    if (node.type === 'file') result.push({ node, path });
    node.children.forEach(child => visit(child, [...parents, node.name]));
  };
  root?.children.forEach(child => visit(child, []));
  return result;
}
