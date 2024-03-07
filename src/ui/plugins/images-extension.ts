// some code from internet
// the code logic is the same as file `img-preview-extension.ts`
// each time the content is changed, the complete document is traversed
import { syntaxTree } from '@codemirror/language'
import {
  EditorState,
  Extension,
  Range,
  RangeSet,
  StateField
} from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  WidgetType
} from '@codemirror/view'

interface ImageWidgetParams {
  url: string
}

class ImageWidget extends WidgetType {
  readonly url

  constructor({ url }: ImageWidgetParams) {
    super()

    this.url = url
  }

  eq(imageWidget: ImageWidget) {
    return imageWidget.url === this.url
  }

  toDOM() {
    const container = document.createElement('div')
    const image = container.appendChild(document.createElement('img'))

    container.setAttribute('aria-hidden', 'true')
    container.setAttribute('class', 'cm-image-preview-box')
    image.setAttribute('src', `atom://${this.url}`)
    image.setAttribute('class', 'cm-image-preview')

    return container
  }
}

export const images = (): Extension => {
  const previewRegx = /^!\[.*\]\(.* ['"](.*)['"]\)$/
  const urlRegx = /^!\[.*?\]\((.*?) .*\)$/
  // const imageRegex = /!\[.*?\]\((?<url>.*?)\)/

  const imageDecoration = (imageWidgetParams: ImageWidgetParams) =>
    Decoration.widget({
      widget: new ImageWidget(imageWidgetParams),
      side: -1,
      block: true
    })

  const decorate = (state: EditorState) => {
    const widgets: Range<Decoration>[] = []

    syntaxTree(state).iterate({
      enter: ({ type, from, to }) => {
        if (type.name === 'Image') {
          const imgText = state.doc.sliceString(from, to)
          const isPreview = previewRegx.exec(imgText)
          if (
            !isPreview ||
            isPreview.length <= 1 ||
            !isPreview[1].split(',').includes('preview')
          )
            return

          const result = urlRegx.exec(imgText)

          if (result && result.length > 1) {
            widgets.push(
              imageDecoration({ url: result[1] }).range(
                state.doc.lineAt(from).from
              )
            )
          }
        }
      }
    })

    return widgets.length > 0 ? RangeSet.of(widgets) : Decoration.none
  }

  // add custom class
  const imagesTheme = EditorView.baseTheme({
    '.cm-image-preview-box': {
      textAlign: 'center'
    },
    '.cm-image-preview': {
      width: '90%',
      margin: 'auto',
      borderRadius: 'var(--nw-border-radius-md)',
      boxShadow: '0px 0px 5px #000000'
    }
  })

  const imagesField = StateField.define<DecorationSet>({
    create(state) {
      return decorate(state)
    },
    update(images, transaction) {
      if (transaction.docChanged) {
        return decorate(transaction.state)
      }

      return images.map(transaction.changes)
    },
    provide(field) {
      return EditorView.decorations.from(field)
    }
  })

  return [imagesTheme, imagesField]
}
