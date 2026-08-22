import { FC, useCallback, useRef, useState } from 'react';
import { WindowDragBox } from 'src/ui/components/drag';
import { useLibraryActions, useLibraryState } from 'src/ui/domain/library';
import { useRuntimeLayout } from 'src/ui/domain/runtime';
import { useRendererCommand } from 'src/ui/shared/renderer-command';
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
