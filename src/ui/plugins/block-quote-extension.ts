import { ensureSyntaxTree } from '@codemirror/language'
import { RangeSet, Range, Extension } from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate
} from '@codemirror/view'

const theme = EditorView.baseTheme({
  '.cm-content > .cm-quote-block': {
    backgroundColor: 'rgba(226,232,240,0.5)'
  },
  '.cm-content > .cm-quote-block-start': {
    paddingTop: '5px'
  },
  '.cm-content > .cm-quote-block-end': {
    paddingBottom: '5px'
  }
})

const addDeco = (view: EditorView) => {
  const deco: Range<Decoration>[] = []

  for (const { from, to } of view.visibleRanges) {
    ensureSyntaxTree(view.state, to, 200).iterate({
      from,
      to,
      enter: node => {
        if (node.name === 'Blockquote') {
          for (let pos = node.from; pos <= node.to; ) {
            const line = view.state.doc.lineAt(pos)
            deco.push({
              from: line.from,
              to: line.from,
              value: Decoration.line({
                class: 'cm-quote-block'
              })
            })
            pos = line.to + 1
          }
          const startLine = view.state.doc.lineAt(node.from)
          const endLine = view.state.doc.lineAt(node.to)
          deco.push({
            from: startLine.from,
            to: startLine.from,
            value: Decoration.line({
              class: 'cm-quote-block-start'
            })
          })
          deco.push({
            from: endLine.from,
            to: endLine.from,
            value: Decoration.line({
              class: 'cm-quote-block-end'
            })
          })
        }
      }
    })
  }

  return RangeSet.of(deco, true)
}

const plugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = addDeco(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = addDeco(update.view)
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

export const blockquote = (): Extension => [theme, plugin]
