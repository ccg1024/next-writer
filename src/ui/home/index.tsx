import { useCallback, useMemo, useRef, useState } from 'react';
import useRenderConfig from '../hooks/useRenderConfig';
import { BaseLayout } from '../modules/layout';
import LibrarySidebar from '../modules/library-sidebar';
import Main, { ExposedHandler as MainExposed } from '../modules/main';
import HomeContext, { Library } from './module.context';
import { LibraryDetail } from '_types';

import './index.css';

const Home = () => {
  const [currentLib, setCurrentLib] = useState<Library>(null);
  const renderConfig = useRenderConfig();

  const mainRef = useRef<MainExposed>(null);
  const mainRefCallback = useCallback((lib: LibraryDetail) => {
    mainRef.current?.queryFile(lib);
  }, []);

  const contenxtValue = useMemo(
    () => ({
      renderConfig,
      currentLib,
      setCurrentLib
    }),
    [renderConfig, currentLib]
  );

  return (
    <HomeContext.Provider value={contenxtValue}>
      <BaseLayout>
        <LibrarySidebar detailCallback={mainRefCallback} />
        <Main ref={mainRef} />
      </BaseLayout>
    </HomeContext.Provider>
  );
};

export default Home;
