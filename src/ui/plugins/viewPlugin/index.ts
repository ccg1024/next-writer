import { Extension } from '@codemirror/state';
import codeblockExtension from './codeblock';
import inlineTagExtension from './inline-tags';
import blockQuoteExtension from './block-quote';
import listExtension from './list';

const extensions = [codeblockExtension, inlineTagExtension, blockQuoteExtension, listExtension];

const ViewPlugins = (): Extension => {
  return [...extensions.map(e => e.theme), ...extensions.map(e => e.plugin)];
};

export default ViewPlugins;
