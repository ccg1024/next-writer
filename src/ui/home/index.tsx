import { useCallback, useEffect, useMemo, useRef } from 'react';
import useRenderConfig from '../hooks/useRenderConfig';
import { BaseLayout } from '../modules/layout';
import LibrarySidebar, { type LibrarySidebarExpoused } from '../modules/library-sidebar';
import Main, { type ExposedHandler as MainExposed } from '../modules/main';
import { ThemeProvider } from './module.context';
import { LibraryTree } from '_types';
import rendererIpcListener from '../modules/ipc';

import './index.css';

const Home = () => {
  const renderConfig = useRenderConfig();

  const mainRef = useRef<MainExposed>(null);
  const sidebarRef = useRef<LibrarySidebarExpoused>(null);

  // ============================================================
  // Effects
  // ============================================================
  // Start listen ipc event
  useEffect(() => {
    rendererIpcListener.start();

    return () => {
      rendererIpcListener.stop();
    };
  }, []);

  // This function will be called when change note.
  const mainRefCallback = useCallback((noteId: string, note: LibraryTree, parent: LibraryTree) => {
    mainRef.current?.queryFile(noteId, note, parent);
  }, []);

  // Update lib item information.
  const updateLibItem = useCallback((libItem: LibraryTree) => {
    sidebarRef.current && sidebarRef.current.updateLibItem(libItem);
  }, []);

  const themeConfig = useMemo(() => ({ config: renderConfig?.config }), [renderConfig?.config]);

  return (
    <ThemeProvider value={themeConfig}>
      <BaseLayout>
        {/* Show lib bar and detail bar of current lib */}
        <LibrarySidebar ref={sidebarRef} onNoteChange={mainRefCallback} />
        {/* Show current note */}
        <Main ref={mainRef} onLibContentChange={updateLibItem} />
      </BaseLayout>
    </ThemeProvider>
  );
};

export default Home;
