// hide some mark when cursor not in-line
// author: crazycodegame
import { ensureSyntaxTree } from '@codemirror/language'
import { Range, RangeSet } from '@codemirror/state'
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
  const decos: Range<Decoration>[] = []
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
            decos.push({
              from: line.from,
              to: line.from,
              value: Decoration.line({
                attributes: { class: 'cm-head-relative' },
                permanent: true
              })
            })
            if (diff > headLevel + 1) {
              decos.push({
                from: node.from,
                to: node.from + headLevel + 1,
                value: Decoration.replace({})
              })
            }
            decos.push({
              from: node.from,
              to: node.from,
              value: Decoration.widget({
                widget: new OffsetHeadMark('#'.repeat(headLevel)),
                side: -1,
                block: false,
                name: 'OffsetHeadMark',
                type: 'line-disable',
                permanent: true
              })
            })
          } else if (node.name === 'Emphasis') {
            decos.push({
              from: node.from,
              to: node.from + 1,
              value: Decoration.replace({
                name: 'Emphasis',
                from: node.from,
                to: node.to,
                type: 'inline-pair'
              })
            })
            decos.push({
              from: node.to - 1,
              to: node.to,
              value: Decoration.replace({
                name: 'Emphasis',
                from: node.from,
                to: node.to,
                type: 'inline-pair'
              })
            })
          } else if (node.name === 'StrongEmphasis') {
            decos.push({
              from: node.from,
              to: node.from + 2,
              value: Decoration.replace({
                name: 'StrongEmphasis',
                from: node.from,
                to: node.to,
                type: 'inline-pair'
              })
            })
            decos.push({
              from: node.to - 2,
              to: node.to,
              value: Decoration.replace({
                name: 'StrongEmphasis',
                from: node.from,
                to: node.to,
                type: 'inline-pair'
              })
            })
          } else if (node.name === 'InlineCode') {
            decos.push({
              from: node.from,
              to: node.from + 1,
              value: Decoration.replace({
                name: 'InlineCode',
                from: node.from,
                to: node.to,
                type: 'inline-pair'
              })
            })
            decos.push({
              from: node.to - 1,
              to: node.to,
              value: Decoration.replace({
                name: 'InlineCode',
                from: node.from,
                to: node.to,
                type: 'inline-pair'
              })
            })
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

              decos.push({
                from: line.from,
                to: line.from,
                value: Decoration.line({
                  attributes: { class: 'cm-text-center' },
                  permanent: true
                })
              })
              decos.push({
                from: node.from,
                to: node.from + 1,
                value: Decoration.replace({})
              })
              decos.push({
                from: node.from + 3 + textLen,
                to: node.to,
                value: Decoration.replace({})
              })
            }
          } else if (node.name === 'HorizontalRule') {
            const line = view.state.doc.lineAt(node.from)
            decos.push({
              from: line.from,
              to: line.from,
              value: Decoration.line({
                attributes: { class: 'cm-horizontal-rule' },
                name: 'HorizontalRule',
                type: 'line-disable'
              })
            })
            decos.push({
              from: node.from,
              to: node.to,
              value: Decoration.replace({
                name: 'HorizontalRule',
                type: 'line-disable'
              })
            })
          } else if (node.name === 'Link') {
            const sliceString = view.state.doc.sliceString(node.from, node.to)
            const pat = /^\[(.*)\]\((.*)\)/
            const match = pat.exec(sliceString)
            if (!match || match[2].length === 0) return

            // hide link url
            decos.push({
              from: node.from + match[1].length + 2,
              to: node.to,
              value: Decoration.replace({})
            })
          }
        }
      })
    }
  }

  return RangeSet.of(decos, true)
}

function removeDeco(view: EditorView, decorations: DecorationSet) {
  const curRange = view.state.selection.ranges
  if (curRange == undefined) return decorations

  const line = view.state.doc.lineAt(curRange[0].from).from
  // const cursor = view.state.selection.main.from

  // no change in selection mode
  // if (!view.state.selection.main.empty) return decorations

  return decorations.update({
    filter: (from, _to, v) => {
      if (v.spec.permanent) return true

      if (view.state.doc.lineAt(from).from == line) return false

      // if (
      //   v.spec.type === 'inline-pair' &&
      //   cursor >= v.spec.from &&
      //   cursor <= v.spec.to
      // )
      //   return false
      //
      // if (
      //   v.spec.type === 'line-disable' &&
      //   view.state.doc.lineAt(from).from == line
      // )
      //   return false
      //
      // if (cursor >= from && cursor <= to) return false

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
