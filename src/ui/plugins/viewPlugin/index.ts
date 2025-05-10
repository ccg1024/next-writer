import { Extension } from '@codemirror/state';
import codeblockExtension from './codeblock';

const extensions = [codeblockExtension];

const ViewPlugins = (): Extension => {
  return [...extensions.map(e => e.theme), ...extensions.map(e => e.plugin)];
};

export default ViewPlugins;
