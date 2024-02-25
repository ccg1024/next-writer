import {
  EditorView,
  WidgetType,
  Decoration,
  DecorationSet,
  ViewUpdate,
  ViewPlugin
} from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { Extension, Range } from '@codemirror/state'

const imgTheme = EditorView.baseTheme({
  '.img-preview': {
    width: '100%',
    position: 'relative',
    zIndex: '-1',
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
    wrap.setAttribute('class', 'img-preview')
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
