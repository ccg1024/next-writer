// Try to auto toggle headings mark
// success, this extension could be rebuild as hide mark extension.
// Not only for heading mark
// update-time: 2024/2/20 add EmphasisMark
// author: crazycodegame
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate
} from '@codemirror/view'
import { RangeSetBuilder, Extension } from '@codemirror/state'
import { ensureSyntaxTree } from '@codemirror/language'

const markTheme = EditorView.baseTheme({
  '&light .cm-toggle-mark': {
    display: 'none'
  },
  '&dark .cm-toggle-mark': {
    display: 'none'
  }
})

export function toggleHeadingMark(): Extension {
  return [markTheme, toggleHeadingMarkPlugin]
}

const toggleHeadingMarkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = newDeco(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        // this.decorations = newDeco(update.view)
      }
    }

    destroy() {
      this.decorations = null
    }
  },
  {
    decorations: v => v.decorations
  }
)

function newDeco(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to } of view.visibleRanges) {
    const tree = ensureSyntaxTree(view.state, to, 200)
    if (tree) {
      tree.iterate({
        from,
        to,
        enter: node => {
          if (node.name === 'HeaderMark') {
            builder.add(node.from, node.to + 1, headingMarkDeco)
          } else if (node.name === 'EmphasisMark') {
            builder.add(node.from, node.to, headingMarkDeco)
          } else if (node.name === 'InlineCode') {
            builder.add(node.from, node.from + 1, headingMarkDeco)
            builder.add(node.to - 1, node.to, headingMarkDeco)
          }
        }
      })
    }
  }

  return builder.finish()
}

const headingMarkDeco = Decoration.mark({
  attributes: { class: 'cm-toggle-mark' }
})
