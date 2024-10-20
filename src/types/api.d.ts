import { LibraryType } from '_types';

export interface IAddLibOrFile {
  type: LibraryType;
  path: string;
  title: string;
}

export type IDelLibOrFile = IAddLibOrFile;

export interface QueryFileDTO {
  path: string;
}
