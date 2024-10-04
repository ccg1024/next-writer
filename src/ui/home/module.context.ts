import { createContext, useContext } from 'react';

const HomeContext = createContext(null);

export const useHomeContext = () => {
  return useContext(HomeContext);
};

export default HomeContext;
