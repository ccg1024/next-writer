import { Extension } from '@codemirror/state';
import codeblockExtension from './codeblock';
import inlineTagExtension from './inline-tags';
import blockQuoteExtension from './block-quote';

const extensions = [codeblockExtension, inlineTagExtension, blockQuoteExtension];

const ViewPlugins = (): Extension => {
  return [...extensions.map(e => e.theme), ...extensions.map(e => e.plugin)];
};

export default ViewPlugins;
