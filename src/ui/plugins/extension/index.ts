import { BoldItalic, tagStyles as boldItalicTags } from './bold-italic';
import { ImageAttributes, tagStyles as imageAttributeTags } from './image-attributes';

export const nextWriterSyntaxExtension = {
  syntax: [BoldItalic, ImageAttributes],
  tagStyles: [...boldItalicTags, ...imageAttributeTags]
};
