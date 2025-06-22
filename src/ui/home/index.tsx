import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import useRenderConfig from '../hooks/useRenderConfig';
import { BaseLayout } from '../modules/layout';
import LibrarySidebar, { type LibrarySidebarExpoused } from '../modules/library-sidebar';
import Main, { type ExposedHandler as MainExposed } from '../modules/main';
import { ThemeProvider } from './module.context';
import { LibraryTree } from '_types';
import rendererIpcListener from '../modules/ipc';
import PluginGlobal from '../plugins/global';
import Outline from '../modules/outline';

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
        <Outline />
      </BaseLayout>
      <FontMeasure />
    </ThemeProvider>
  );
};

function FontMeasure() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (ref.current) {
      PluginGlobal.set('font', window.getComputedStyle(ref.current).font);
    }
  }, []);
  return <span ref={ref} id="nw-measure" style={{ display: 'none', fontFamily: 'monospace' }}></span>;
}

export default Home;
