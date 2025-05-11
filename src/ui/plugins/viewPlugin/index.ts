import { Extension } from '@codemirror/state';
import codeblockExtension from './codeblock';
import inlineTagExtension from './inline-tags';

const extensions = [codeblockExtension, inlineTagExtension];

const ViewPlugins = (): Extension => {
  return [...extensions.map(e => e.theme), ...extensions.map(e => e.plugin)];
};

export default ViewPlugins;
