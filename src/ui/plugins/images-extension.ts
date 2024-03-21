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

interface VideoWidgetParams {
  src: string
}

class VideoWidge extends WidgetType {
  readonly src

  constructor({ src }: VideoWidgetParams) {
    super()

    this.src = src
  }

  eq(videoWidget: VideoWidge) {
    return videoWidget.src === this.src
  }

  toDOM() {
    const container = document.createElement('div')
    const video = container.appendChild(document.createElement('video'))
    const sourcewb = video.appendChild(document.createElement('source'))
    const source = video.appendChild(document.createElement('source'))

    container.setAttribute('class', 'cm-video-preview-box')
    video.controls = true
    video.autoplay = false
    video.preload = 'auto'
    video.setAttribute('class', 'cm-video-preview')
    source.setAttribute('src', `atom://${this.src}`)
    source.setAttribute('type', 'video/mp4')
    sourcewb.setAttribute('src', `atom://${this.src}`)
    sourcewb.setAttribute('type', 'video/webm')

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
  const videoDecoration = (videoWidgetParams: VideoWidgetParams) =>
    Decoration.widget({
      widget: new VideoWidge(videoWidgetParams),
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
        } else if (type.name === 'NWvideo') {
          // Check whether to show a video
          const patter = /^\[\[(.*)\]\]$/
          const doc = state.doc.sliceString(from, to)
          const result = patter.exec(doc)

          if (!result || result.length <= 1) return

          const videoText = result[1]
          const videoTokens = videoText.split(' ')
          if (videoTokens.length <= 1) return

          const src = videoTokens[0]

          if (!videoTokens.slice(1).includes('preview')) return

          widgets.push(
            videoDecoration({ src }).range(state.doc.lineAt(from).from)
          )
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
      boxShadow: 'var(--nw-box-shadow-md)'
    },
    '.cm-video-preview': {
      width: '90%',
      boxShadow: 'var(--nw-box-shadow-md)',
      borderRadius: 'var(--nw-border-radius-sm)'
    },
    '.cm-video-preview-box': {
      boxSizing: 'border-box',
      width: '100%',
      textAlign: 'center'
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
