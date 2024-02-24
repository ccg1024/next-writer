// hide some mark when cursor not in-line
// author: crazycodegame
import { ensureSyntaxTree } from '@codemirror/language'
import { RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  ViewPlugin,
  EditorView,
  DecorationSet,
  ViewUpdate
} from '@codemirror/view'

function addDeco(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to } of view.visibleRanges) {
    const tree = ensureSyntaxTree(view.state, to, 200)
    if (tree) {
      tree.iterate({
        from,
        to,
        enter: node => {
          if (node.name === 'HeaderMark') {
            builder.add(node.from, node.to + 1, Decoration.replace({}))
          } else if (node.name === 'EmphasisMark') {
            builder.add(node.from, node.to, Decoration.replace({}))
          } else if (node.name === 'InlineCode') {
            builder.add(node.from, node.from + 1, Decoration.replace({}))
            builder.add(node.to - 1, node.to, Decoration.replace({}))
          } else if (node.name === 'Image') {
            // need a global config to check whther use img-preview extension.
            // NOTE: the code blew is asuming using img-preview extension.
            const imgText = view.state.doc.sliceString(node.from, node.to)
            const regPre = /^!\[.*\]\(.* ['"](.*)['"]\)$/.exec(imgText)
            if (!regPre || regPre.length <= 1) return

            const imgAlign = regPre[1]
            if (!imgAlign.split(',').includes('preview')) return

            builder.add(node.from, node.to, Decoration.replace({}))
          }
        }
      })
    }
  }

  return builder.finish()
}

function removeDeco(view: EditorView, decorations: DecorationSet) {
  const curRange = view.state.selection.ranges
  if (curRange == undefined) return decorations

  const line = view.state.doc.lineAt(curRange[0].from).from

  return decorations.update({
    filter: (from, _to, _v) => {
      if (view.state.doc.lineAt(from).from == line) return false

      return true
    }
  })
}

export const hideMarkPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = addDeco(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = addDeco(update.view)
        this.decorations = removeDeco(update.view, this.decorations)
      }
    }
  },
  {
    decorations: v => v.decorations
  }
)
