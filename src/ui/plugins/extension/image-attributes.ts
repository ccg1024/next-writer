import { TagStyle } from '@codemirror/language';
import { Tag } from '@lezer/highlight';
import { InlineContext, MarkdownConfig } from '@lezer/markdown';

const imageAttributeTag = {
  ImageAttributes: Tag.define(),
  ImageAttributeMark: Tag.define(),
  ImageAttributeName: Tag.define(),
  ImageAttributeValue: Tag.define()
};

export const tagStyles: TagStyle[] = [
  {
    tag: imageAttributeTag.ImageAttributes,
    color: 'var(--nw-theme-link-content)'
  },
  {
    tag: imageAttributeTag.ImageAttributeMark,
    color: 'var(--nw-theme-link-mark)'
  },
  {
    tag: imageAttributeTag.ImageAttributeName,
    color: 'var(--nw-theme-code-info)'
  },
  {
    tag: imageAttributeTag.ImageAttributeValue,
    color: 'var(--nw-theme-url-content)'
  }
];

const IMAGE_ATTRIBUTE_REGX = /([a-zA-Z][\w-]*)=("[^"]*"|'[^']*'|[^\s}]+)/g;
const IMAGE_ATTRIBUTE_NAMES = new Set(['width', 'float']);

function isEscaped(cx: InlineContext, pos: number) {
  let slashCount = 0;
  for (let i = pos - 1; i >= cx.offset && cx.char(i) === 92 /* "\\" */; i -= 1) {
    slashCount += 1;
  }

  return slashCount % 2 === 1;
}

function getImageAttributes(content: string) {
  const attributes: RegExpExecArray[] = [];
  IMAGE_ATTRIBUTE_REGX.lastIndex = 0;

  let attr = IMAGE_ATTRIBUTE_REGX.exec(content);
  while (attr) {
    attributes.push(attr);
    attr = IMAGE_ATTRIBUTE_REGX.exec(content);
  }

  return attributes;
}

function hasImagePrefix(cx: InlineContext, pos: number) {
  if (pos <= cx.offset || cx.char(pos - 1) !== 41 /* ")" */) {
    return false;
  }

  let depth = 0;
  let urlOpen = -1;
  for (let i = pos - 1; i >= cx.offset; i -= 1) {
    const char = cx.char(i);
    if (isEscaped(cx, i)) {
      continue;
    }

    if (char === 41 /* ")" */) {
      depth += 1;
    } else if (char === 40 /* "(" */) {
      depth -= 1;
      if (depth === 0) {
        urlOpen = i;
        break;
      }
    } else if (char === 10 /* "\n" */) {
      return false;
    }
  }

  if (urlOpen <= cx.offset || cx.char(urlOpen - 1) !== 93 /* "]" */) {
    return false;
  }

  depth = 0;
  for (let i = urlOpen - 1; i >= cx.offset; i -= 1) {
    const char = cx.char(i);
    if (isEscaped(cx, i)) {
      continue;
    }

    if (char === 93 /* "]" */) {
      depth += 1;
    } else if (char === 91 /* "[" */) {
      depth -= 1;
      if (depth === 0) {
        return i > cx.offset && cx.char(i - 1) === 33 /* "!" */;
      }
    } else if (char === 10 /* "\n" */) {
      return false;
    }
  }

  return false;
}

export const ImageAttributes: MarkdownConfig = {
  defineNodes: [
    { name: 'ImageAttributes', style: { 'ImageAttributes/...': imageAttributeTag.ImageAttributes } },
    { name: 'ImageAttributeMark', style: imageAttributeTag.ImageAttributeMark },
    { name: 'ImageAttributeName', style: imageAttributeTag.ImageAttributeName },
    { name: 'ImageAttributeValue', style: imageAttributeTag.ImageAttributeValue }
  ],
  parseInline: [
    {
      name: 'ImageAttributes',
      parse(cx, next, pos) {
        if (next !== 123 /* "{" */ || !hasImagePrefix(cx, pos)) {
          return -1;
        }

        let end = pos + 1;
        while (end < cx.end && cx.char(end) !== 125 /* "}" */ && cx.char(end) !== 10 /* "\n" */) {
          end += 1;
        }

        if (cx.char(end) !== 125 /* "}" */) {
          return -1;
        }

        const content = cx.slice(pos + 1, end);
        const attributes = getImageAttributes(content);
        if (!attributes.some(attr => IMAGE_ATTRIBUTE_NAMES.has(attr[1].toLowerCase()))) {
          return -1;
        }

        const children = [cx.elt('ImageAttributeMark', pos, pos + 1)];
        attributes.forEach(attr => {
          const nameFrom = pos + 1 + attr.index;
          const nameTo = nameFrom + attr[1].length;
          const valueFrom = nameTo + 1;
          const valueTo = valueFrom + attr[2].length;
          children.push(cx.elt('ImageAttributeName', nameFrom, nameTo));
          children.push(cx.elt('ImageAttributeValue', valueFrom, valueTo));
        });
        children.push(cx.elt('ImageAttributeMark', end, end + 1));

        return cx.addElement(cx.elt('ImageAttributes', pos, end + 1, children));
      },
      after: 'Link'
    }
  ]
};
