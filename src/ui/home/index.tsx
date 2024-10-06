import { useCallback, useState } from 'react';
import useRenderConfig from '../hooks/useRenderConfig';
import { BaseLayout } from '../modules/layout';
import LibrarySidebar from '../modules/library-sidebar';
import Main from '../modules/main';
import './index.css';
import HomeContext, { Library } from './module.context';

const Home = () => {
  const [currentLib, setCurrentLib] = useState<Library>(null);
  const setCallback = useCallback((lib: Partial<Library>) => {
    setCurrentLib(pre => ({ ...pre, ...lib }));
  }, []);
  const renderConfig = useRenderConfig();

  return (
    <HomeContext.Provider value={{ renderConfig, currentLib, setCurrentLib: setCallback }}>
      <BaseLayout>
        <LibrarySidebar />
        <Main />
      </BaseLayout>
    </HomeContext.Provider>
  );
};

export default Home;
