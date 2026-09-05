import { FC, useCallback, useRef, useState } from 'react';
import { WindowDragBox } from 'src/ui/components/drag';
import { useLibraryActions, useLibraryState } from 'src/ui/domain/library';
import { useRuntimeLayout } from 'src/ui/domain/runtime';
import { useRendererCommand } from 'src/ui/shared/renderer-command';
import { useRegisterCommand } from 'src/ui/domain/command';
import { App } from 'antd';
import { isEffectObject } from 'src/tools/utils';
import { nwSpin } from 'src/ui/mix-components/spin';
import type { RendererLibraryTree } from '_types';
import { LibraryList } from './library-list';
import { NoteList } from './note-list';
import { DocumentShortcuts } from './document-shortcuts';
import { ForwardRenameHandler, ForwardRenameModal } from './rename-modal';
import { WorkspaceSearch } from './workspace-search';

import './index.less';

/** 组合文库列表、笔记列表和共享重命名弹窗，并响应主进程的侧栏显隐命令。 */
const LibrarySidebar: FC = () => {
  const { libraryTree, currentLib, currentNote } = useLibraryState();
  const { setCurrentLib, setCurrentNote } = useLibraryActions();
  const { librarySidebarVisible, detailSidebarVisible, setLibrarySidebarVisible, setDetailSidebarVisible } =
    useRuntimeLayout();
  const renameRef = useRef<ForwardRenameHandler>(null);
  const { message } = App.useApp();
  const { createLibrary, createNote, setLibraryTree } = useLibraryActions();
  const [searchOpen, setSearchOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useRendererCommand('toggle-lib', (_e, action) => {
    setLibrarySidebarVisible(!!action.payload);
  });

  useRendererCommand('toggle-lib-detail', (_e, action) => {
    setDetailSidebarVisible(!!action.payload);
  });

  useRendererCommand('open-document-shortcuts', () => {
    setShortcutsOpen(true);
  });

  useRegisterCommand({
    id: 'workspace.search.open',
    title: '搜索工作区',
    category: 'action',
    keywords: ['全文搜索', '查找', 'search'],
    shortcut: 'Cmd/Ctrl+Shift+F',
    execute: () => setSearchOpen(true)
  });

  useRegisterCommand({
    id: 'library.create',
    title: '新建文库',
    category: 'action',
    keywords: ['新建文件夹', '添加库', 'folder'],
    execute: () => {
      renameRef.current?.show(
        '',
        async name => {
          const normalized = name.trim();
          if (libraryTree.children.some(child => child.type === 'folder' && child.name === normalized)) {
            message.error('名称重复');
            return;
          }
          nwSpin.loading(true);
          try {
            const response = await createLibrary(normalized);
            if (response.status === 0 && isEffectObject(response.data)) setLibraryTree(response.data);
            else message.error(response.message || '新建文库失败');
          } finally {
            nwSpin.loading(false);
          }
        },
        { title: '新建库' }
      );
    }
  });

  useRegisterCommand({
    id: 'note.create',
    title: '新建笔记',
    category: 'action',
    keywords: ['新增文档', 'note'],
    availability: () => ({ enabled: Boolean(currentLib), reason: currentLib ? undefined : '没有当前文库' }),
    execute: () => {
      renameRef.current?.show(
        '',
        async name => {
          const normalized = name.trim();
          if (currentLib.children.some(child => child.type === 'file' && child.name === normalized)) {
            message.error('名称重复');
            return;
          }
          nwSpin.loading(true);
          try {
            const response = await createNote(currentLib, normalized);
            if (response.status === 0) setLibraryTree(response.data);
            else message.error(response.message || '新建笔记失败');
          } finally {
            nwSpin.loading(false);
          }
        },
        { title: '新建笔记' }
      );
    }
  });

  const onNoteChange = useCallback((note: RendererLibraryTree) => {
    setCurrentNote(note);
  }, []);

  return (
    <>
      <LibraryList
        libraryTree={libraryTree}
        visible={librarySidebarVisible}
        renameRef={renameRef}
        onSelectLibrary={setCurrentLib}
        onSearch={() => setSearchOpen(true)}
        onShortcuts={() => setShortcutsOpen(true)}
      />
      <NoteList
        currentLib={currentLib}
        currentNote={currentNote}
        detailVisible={detailSidebarVisible}
        libraryVisible={librarySidebarVisible}
        renameRef={renameRef}
        onSelectNote={onNoteChange}
      />
      {!librarySidebarVisible && !detailSidebarVisible && (
        <WindowDragBox style={{ height: '32px', top: 0, left: 0, width: '100%', position: 'fixed' }} />
      )}
      <ForwardRenameModal ref={renameRef} />
      <WorkspaceSearch open={searchOpen} onOpen={() => setSearchOpen(true)} onClose={() => setSearchOpen(false)} />
      <DocumentShortcuts open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </>
  );
};

export default LibrarySidebar;
