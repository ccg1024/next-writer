import { useCallback, useRef, useState } from 'react';
import useRenderConfig from '../hooks/useRenderConfig';
import { BaseLayout } from '../modules/layout';
import LibrarySidebar from '../modules/library-sidebar';
import Main, { ExposedHandler as MainExposed } from '../modules/main';
import HomeContext, { Library } from './module.context';

import './index.css';
import { LibraryTree } from '_types';

const Home = () => {
  const [currentLib, setCurrentLib] = useState<Library>(null);
  const setCallback = useCallback((lib: Partial<Library>) => {
    setCurrentLib(pre => ({ ...pre, ...lib }));
  }, []);
  const renderConfig = useRenderConfig();

  const mainRef = useRef<MainExposed>(null);
  const mainRefCallback = useCallback((lib: LibraryTree) => {
    mainRef.current?.queryFile(lib);
  }, []);

  return (
    <HomeContext.Provider value={{ renderConfig, currentLib, setCurrentLib: setCallback }}>
      <BaseLayout>
        <LibrarySidebar detailCallback={mainRefCallback} />
        <Main ref={mainRef} />
      </BaseLayout>
    </HomeContext.Provider>
  );
};

export default Home;
