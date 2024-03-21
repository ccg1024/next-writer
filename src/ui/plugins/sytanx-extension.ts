import { MarkdownConfig } from '@lezer/markdown'
import { tags, styleTags, Tag } from '@lezer/highlight'

const HighlightDelim = { resolve: 'Highlight', mark: 'HighlightMark' }

export const syntaxTags = {
  highlight: Tag.define(),
  NWvideo: Tag.define()
}

export const Highlight: MarkdownConfig = {
  defineNodes: ['Highlight', 'HighlightMark'],
  parseInline: [
    {
      name: 'Highlight',
      parse(cx, next, pos) {
        if (next != 61 || cx.char(pos + 1) != 61) return -1
        return cx.addDelimiter(HighlightDelim, pos, pos + 2, true, true)
      },
      after: 'Emphasis'
    }
  ],
  props: [
    styleTags({
      HighlightMark: tags.processingInstruction,
      // Highlight: tags.special(tags.strong)
      'Highlight/...': syntaxTags.highlight
    })
  ]
}

const NWVideoDelim = { resolve: 'NWvideo', mark: 'NWvideoMark' }
export const NWvideo: MarkdownConfig = {
  defineNodes: ['NWvideo', 'NWvideoMark'],
  parseInline: [
    {
      name: 'NWvideo',
      parse(cx, next, pos) {
        if (next == 91 && cx.char(pos + 1) == 91) {
          return cx.addDelimiter(NWVideoDelim, pos, pos + 2, true, false)
        }

        if (next == 93 && cx.char(pos + 1) == 93) {
          return cx.addDelimiter(NWVideoDelim, pos, pos + 2, false, true)
        }

        return -1
      },
      before: 'Escape'
    }
  ],
  props: [
    styleTags({
      NWVideoMark: tags.processingInstruction,
      'NWvideo/...': syntaxTags.NWvideo
    })
  ]
}
