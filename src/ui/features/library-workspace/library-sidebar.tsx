import { FC, useCallback, useRef } from 'react';
import { WindowDragBox } from 'src/ui/components/drag';
import { useLibraryActions, useLibraryState } from 'src/ui/domain/library';
import { useRuntimeLayout } from 'src/ui/domain/runtime';
import { useRendererCommand } from 'src/ui/shared/renderer-command';
import type { RendererLibraryTree } from '_types';
import { LibraryList } from './library-list';
import { NoteList } from './note-list';
import { ForwardRenameHandler, ForwardRenameModal } from './rename-modal';

import './index.less';

const LibrarySidebar: FC = () => {
  const { libraryTree, currentLib, currentNote } = useLibraryState();
  const { setCurrentLib, setCurrentNote } = useLibraryActions();
  const { librarySidebarVisible, detailSidebarVisible, setLibrarySidebarVisible, setDetailSidebarVisible } =
    useRuntimeLayout();
  const renameRef = useRef<ForwardRenameHandler>(null);

  useRendererCommand('toggle-lib', (_e, action) => {
    setLibrarySidebarVisible(!!action.payload);
  });

  useRendererCommand('toggle-lib-detail', (_e, action) => {
    setDetailSidebarVisible(!!action.payload);
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
    </>
  );
};

export default LibrarySidebar;
