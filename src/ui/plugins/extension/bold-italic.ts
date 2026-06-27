import { TagStyle } from '@codemirror/language';
import { MarkdownConfig } from '@lezer/markdown';
import { Tag } from '@lezer/highlight';

const boldItalicTag = {
  BoldItalic: Tag.define(),
  BoldItalicMark: Tag.define()
};

export const tagStyles: TagStyle[] = [
  {
    tag: boldItalicTag.BoldItalic,
    fontStyle: 'italic',
    fontWeight: 'bold'
  },
  {
    tag: boldItalicTag.BoldItalicMark,
    color: 'var(--nw-theme-list-mark)'
  }
];

const BoldItalicDelim = { resolve: 'BoldItalic', mark: 'BoldItalicMark' };

export const BoldItalic: MarkdownConfig = {
  defineNodes: [
    { name: 'BoldItalic', style: { 'BoldItalic/...': boldItalicTag.BoldItalic } },
    { name: 'BoldItalicMark', style: boldItalicTag.BoldItalicMark }
  ],
  parseInline: [
    {
      name: 'BoldItalic',
      parse(cx, next, pos) {
        if (next != 42 /* '*' */ || cx.char(pos + 1) != 42 || cx.char(pos + 2) != 42) return -1;
        return cx.addDelimiter(BoldItalicDelim, pos, pos + 3, true, true);
      },
      before: 'Emphasis'
    }
  ]
};
