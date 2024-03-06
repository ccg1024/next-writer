import {
  EditorView,
  WidgetType,
  Decoration,
  DecorationSet,
  ViewUpdate,
  ViewPlugin
} from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import {
  EditorState,
  Extension,
  Range,
  RangeSet,
  RangeSetBuilder,
  StateField
} from '@codemirror/state'

const imgTheme = EditorView.baseTheme({
  '.img-preview': {
    width: '100%',
    borderRadius: '10px',
    boxShadow: '0px 0px 5px #000000'
  }
})

class ImgWidget extends WidgetType {
  constructor(readonly src: string) {
    super()
  }

  eq(other: ImgWidget): boolean {
    return other.src == this.src
  }

  // could recieve a view object `toDom(view)`
  toDOM(): HTMLElement {
    const wrap = document.createElement('img')
    wrap.setAttribute('src', `atom://${this.src}`)
    // wrap.setAttribute('class', 'img-preview')
    wrap.style.width = '80%'
    wrap.style.borderRadius = '10px'
    wrap.style.boxShadow = '0px 0px 5px #000000'
    wrap.style.marginLeft = '10%'
    return wrap
  }

  ignoreEvent(): boolean {
    return false
  }
}

function imgBlock(view: EditorView) {
  const widgets: Range<Decoration>[] = []
  for (const { from, to } of view.visibleRanges) {
    try {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: node => {
          if (node.name == 'Image') {
            const imgText = view.state.doc.sliceString(node.from, node.to)
            const regPre = /^!\[.*\]\(.* ['"](.*)['"]\)$/.exec(imgText)
            // check whether need preview
            if (!regPre || regPre.length <= 1) return

            const imgAlign = regPre[1]
            if (!imgAlign.split(',').includes('preview')) return

            const regRsult = /^!\[.*?\]\((.*?) .*\)$/.exec(imgText)
            if (regRsult.length > 1) {
              const src = regRsult[1]
              const deco = Decoration.widget({
                widget: new ImgWidget(src),
                side: 2
              })
              widgets.push(deco.range(node.from))
            }
          }
        }
      })
    } catch (error) {
      // some err
    }
  }

  return Decoration.set(widgets)
}

const imgWidgetPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = imgBlock(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = imgBlock(update.view)
      }
    }
  },
  {
    decorations: v => v.decorations
  }
)

export function imgPreview(): Extension {
  return [imgTheme, imgWidgetPlugin]
}

// try to make a block widget
export const imgPreviewField = StateField.define<DecorationSet>({
  create(state: EditorState) {
    const builder = new RangeSetBuilder<Decoration>()
    syntaxTree(state).iterate({
      from: 0,
      to: state.doc.length,
      enter: node => {
        if (node.name == 'Image') {
          const imgText = state.doc.sliceString(node.from, node.to)
          const regPre = /^!\[.*\]\(.* ['"](.*)['"]\)$/.exec(imgText)
          // check whether need preview
          if (!regPre || regPre.length <= 1) return

          const imgAlign = regPre[1]
          if (!imgAlign.split(',').includes('preview')) return

          const regRsult = /^!\[.*?\]\((.*?) .*\)$/.exec(imgText)
          if (regRsult.length > 1) {
            const src = regRsult[1]
            builder.add(
              node.from,
              node.from,
              Decoration.widget({
                widget: new ImgWidget(src),
                side: -1,
                block: true
              })
            )
          }
          console.log('into create')
        }
      }
    })
    return builder.finish()
    // return RangeSet.of(decoration().range(state.doc.length))
  },
  update(value, transaction) {
    if (transaction.docChanged) {
      const builder = new RangeSetBuilder<Decoration>()
      syntaxTree(transaction.state).iterate({
        from: 0,
        to: transaction.state.doc.length,
        enter: node => {
          if (node.name == 'Image') {
            const imgText = transaction.state.doc.sliceString(
              node.from,
              node.to
            )
            const regPre = /^!\[.*\]\(.* ['"](.*)['"]\)$/.exec(imgText)
            // check whether need preview
            if (!regPre || regPre.length <= 1) return

            const imgAlign = regPre[1]
            if (!imgAlign.split(',').includes('preview')) return

            const regRsult = /^!\[.*?\]\((.*?) .*\)$/.exec(imgText)
            if (regRsult.length > 1) {
              const src = regRsult[1]
              builder.add(
                node.from,
                node.from,
                Decoration.widget({
                  widget: new ImgWidget(src),
                  side: -1,
                  block: true
                })
              )
            }
          }
        }
      })
      return builder.finish()
    }
    return value
    // return RangeSet.of(decoration().range(transaction.newDoc.length))
  },
  provide(field) {
    return EditorView.decorations.from(field)
  },
  compare(a, b) {
    return a === b
  }
})

// const decoration = () =>
//   Decoration.widget({
//     widget: new ImgWidget(
//       '/Users/ccg/MySupport/CodePlace/creations/imarkdown/img/mac-dark.png'
//     ),
//     side: -1,
//     block: true
//   })
