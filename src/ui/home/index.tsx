import useRenderConfig from '../hooks/useRenderConfig';
import HomeContext from './module.context';

const Home = () => {
  const renderConfig = useRenderConfig();

  return (
    <HomeContext.Provider value={{ renderConfig }}>
      <div></div>
    </HomeContext.Provider>
  );
};

export default Home;
