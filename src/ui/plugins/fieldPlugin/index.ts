import { Extension } from '@codemirror/state';
import imageExtension from './image';

const extensions = [...imageExtension];

const FieldPlugins = (): Extension => {
  return extensions;
};

export default FieldPlugins;
