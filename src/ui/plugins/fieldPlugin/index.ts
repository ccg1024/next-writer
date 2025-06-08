import { Extension } from '@codemirror/state';
import imageExtension from './image';
import outlineExtension from './outline';

const extensions = [...imageExtension, ...outlineExtension];

const FieldPlugins = (): Extension => {
  return extensions;
};

export default FieldPlugins;
