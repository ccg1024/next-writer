import { useCallback, useMemo, useRef } from 'react';
import useRenderConfig from '../hooks/useRenderConfig';
import { BaseLayout } from '../modules/layout';
import LibrarySidebar from '../modules/library-sidebar';
import Main, { ExposedHandler as MainExposed } from '../modules/main';
import { ThemeProvider } from './module.context';
import { LibraryBase, LibraryTree } from '_types';

import './index.css';

const Home = () => {
  const renderConfig = useRenderConfig();

  const mainRef = useRef<MainExposed>(null);

  // This function will be called when change note.
  const mainRefCallback = useCallback((noteId: string, note: LibraryBase, parent: LibraryTree) => {
    mainRef.current?.queryFile(noteId, note, parent);
  }, []);

  const themeConfig = useMemo(() => ({ config: renderConfig?.config }), [renderConfig?.config]);

  return (
    <ThemeProvider value={themeConfig}>
      <BaseLayout>
        {/* Show lib bar and detail bar of current lib */}
        <LibrarySidebar storedLibrary={renderConfig?.libTree} onNoteChange={mainRefCallback} />
        {/* Show current note */}
        <Main ref={mainRef} />
      </BaseLayout>
    </ThemeProvider>
  );
};

export default Home;
