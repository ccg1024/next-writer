// hide some mark when cursor not in-line
// author: crazycodegame
import { ensureSyntaxTree } from '@codemirror/language'
import { RangeSetBuilder } from '@codemirror/state'
import {
  Decoration,
  ViewPlugin,
  EditorView,
  DecorationSet,
  ViewUpdate,
  WidgetType
} from '@codemirror/view'

const ATXHeading = [
  'ATXHeading1',
  'ATXHeading2',
  'ATXHeading3',
  'ATXHeading4',
  'ATXHeading5',
  'ATXHeading6'
]

class OffsetHeadMark extends WidgetType {
  mark: string
  constructor(mark: string) {
    super()
    this.mark = mark
  }
  eq(widget: OffsetHeadMark) {
    return this.mark === widget.mark
  }
  toDOM() {
    const span = document.createElement('span')
    span.innerHTML = `#<sup>${this.mark.length}</sup> `
    span.style.cssText = `
      position: absolute;
      left: 0;
      top: 50%;
      transform: translate(-100%, -50%);
      color: #A9BBCC
`
    return span
  }
}

function addDeco(view: EditorView) {
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to } of view.visibleRanges) {
    const tree = ensureSyntaxTree(view.state, to, 200)
    if (tree) {
      tree.iterate({
        from,
        to,
        enter: node => {
          if (ATXHeading.includes(node.name)) {
            // Cannot using meadmarks, since the content will be a head
            // when there are three '=' or '-' next below the line.
            // Then,
            // just there are head content, the head mark and 1 space will be hidden.
            const headLevel = parseInt(node.name[node.name.length - 1])
            const diff = node.to - node.from

            // make a margin
            const line = view.state.doc.lineAt(node.from)
            builder.add(
              line.from,
              line.from,
              Decoration.line({
                attributes: { class: 'cm-head-relative' },
                permanent: true
              })
            )
            if (diff > headLevel + 1) {
              builder.add(
                node.from,
                node.from + headLevel + 1,
                Decoration.replace({})
              )
            }
            builder.add(
              node.to,
              node.to,
              Decoration.widget({
                widget: new OffsetHeadMark('#'.repeat(headLevel)),
                side: 1,
                block: false
              })
            )
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

            const regx = /^!\[(.*?)\].*?/
            const altText = regx.exec(imgText)
            if (altText && altText.length > 1) {
              const textLen = altText[1].length
              const line = view.state.doc.lineAt(node.from)

              builder.add(
                line.from,
                line.from,
                Decoration.line({
                  attributes: { class: 'cm-text-center' }
                })
              )
              builder.add(node.from, node.from + 1, Decoration.replace({}))
              builder.add(
                node.from + 3 + textLen,
                node.to,
                Decoration.replace({})
              )
            }
          } else if (node.name === 'HorizontalRule') {
            const line = view.state.doc.lineAt(node.from)
            builder.add(
              line.from,
              line.from,
              Decoration.line({
                attributes: { class: 'cm-horizontal-rule' }
              })
            )
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
      if (view.state.doc.lineAt(from).from == line && !_v.spec.permanent)
        return false

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
