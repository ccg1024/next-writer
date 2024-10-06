import { createContext, useContext } from 'react';
import { NormalObject } from '_types';

export interface Library {
  root: string;
  file: string;
}

export interface IHomeContext {
  currentLib: Library;
  renderConfig: NormalObject;
  setCurrentLib: (lib: Partial<Library>) => void;
}

const HomeContext = createContext<IHomeContext>(null);

export const useHomeContext = () => {
  return useContext(HomeContext);
};

export default HomeContext;
