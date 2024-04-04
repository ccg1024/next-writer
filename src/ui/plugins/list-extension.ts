import { css } from '@emotion/css'
import { ensureSyntaxTree } from '@codemirror/language'
import { Extension, Range, RangeSet } from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType
} from '@codemirror/view'

const theme = EditorView.baseTheme({
  '.cm-list-mark-absolute': {
    position: 'absolute',
    transform: 'translateX(-100%)',
    color: '#4299E1',
    fontWeight: 'bold'
  }
})

// class DivWidget extends WidgetType {
//   readonly mark
//   readonly text
//   constructor(mark: string, text: string) {
//     super()
//     this.mark = mark
//     this.text = text
//   }
//   toDOM() {
//     const div = document.createElement('div')
//     // const mark = div.appendChild(document.createElement('span'))
//     // const text = div.appendChild(document.createElement('span'))
//     div.style.height = 'inherit'
//
//     const wrapcls = css({
//       whiteSpace: 'nowrap',
//       display: 'inline-block'
//     })
//     div.setAttribute('class', wrapcls)
//     div.innerHTML = this.mark + this.text
//     // mark.setAttribute('class', wrapcls)
//     // text.setAttribute('class', wrapcls)
//     // mark.innerHTML = this.mark
//     // text.innerHTML = this.text
//     return div
//   }
// }

class ListMark extends WidgetType {
  readonly text

  constructor(text: string) {
    super()
    this.text = text
  }

  eq(widget: ListMark) {
    return this.text === widget.text
  }

  toDOM() {
    const span = document.createElement('span')
    span.innerHTML = this.text
    span.setAttribute('class', 'cm-list-mark-absolute')
    span.setAttribute('aria-hidden', 'true')
    return span
  }

  ignoreEvent(): boolean {
    return false
  }
}

const updateDeco = (view: EditorView) => {
  const deco: Range<Decoration>[] = []
  for (const { from, to } of view.visibleRanges) {
    ensureSyntaxTree(view.state, to, 200).iterate({
      from,
      to,
      enter: node => {
        if (node.name === 'ListMark') {
          const mark = view.state.doc.sliceString(node.from, node.to)
          const isNumber = !['-', '*', '+'].includes(mark)
          const line = view.state.doc.lineAt(node.from)
          const diff = node.from - line.from
          const offsetWidth = Math.floor(diff / 2) + 1 + (isNumber ? 0.5 : 0)
          const additionofssetWidth = isNumber ? (mark.length - 2) * 0.6 : 0
          const cls = css({
            marginInlineStart: `${offsetWidth + additionofssetWidth}em`,
            position: 'relative'
          })
          deco.push({
            from: line.from,
            to: line.from,
            value: Decoration.line({
              class: cls
            })
          })
          const offset = line.to - node.to > 0 ? 1 : 0
          deco.push({
            from: line.from,
            to: node.to + offset,
            value: Decoration.replace({
              widget: new ListMark(
                view.state.doc.sliceString(node.from, node.to + offset)
              )
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
      this.decorations = updateDeco(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = updateDeco(update.view)
      }
    }

    destroy() {
      this.decorations = null
    }
  },
  {
    decorations: v => v.decorations,
    provide: plugin =>
      EditorView.atomicRanges.of(view => {
        return view.plugin(plugin)?.decorations || Decoration.none
      })
  }
)

// type ListMap = {
//   mark: string
//   from: number
//   to: number
// }
// const getListPos = (state: EditorState) => {
//   const listMaps: Array<ListMap> = []
//   ensureSyntaxTree(state, state.doc.length, 200).iterate({
//     enter(node) {
//       if (node.name === 'ListMark') {
//         const mark = state.doc.sliceString(node.from, node.to)
//         listMaps.push({
//           mark,
//           from: node.from,
//           to: node.to
//         })
//       }
//     }
//   })
//   return listMaps
// }
//
// // define a state feild
// const listField = StateField.define<DecorationSet>({
//   create() {
//     return Decoration.none
//   },
//   update(_value, tr) {
//     const decos: Range<Decoration>[] = []
//
//     ensureSyntaxTree(tr.state, tr.state.doc.length, 200).iterate({
//       enter(node) {
//         if (node.name === 'ListMark') {
//           const line = tr.state.doc.lineAt(node.from)
//           console.log(line)
//           const mark = tr.state.doc.sliceString(node.from, node.to)
//           const text = tr.state.doc.sliceString(node.to, line.to)
//           decos.push(
//             Decoration.replace({
//               widget: new DivWidget(mark, text),
//               inclusive: true
//             }).range(line.from, line.to)
//           )
//         }
//       }
//     })
//     return RangeSet.of(decos, true)
//   },
//   provide: f => EditorView.decorations.from(f)
// })

export const prettierList = (): Extension => [theme, plugin]
