import { syntaxTree } from '@codemirror/language'
import { Extension, Range, RangeSet } from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType
} from '@codemirror/view'
import { Post } from '../libs/utils'

const theme = EditorView.baseTheme({
  '.cm-embed-link': {
    '&:hover': {
      cursor: 'pointer'
    }
  }
})

class Link extends WidgetType {
  readonly url
  constructor(url: string) {
    super()
    this.url = url
  }

  eq(link: Link) {
    return this.url === link.url
  }

  toDOM() {
    const wrapper = document.createElement('span')
    const img = wrapper.appendChild(document.createElement('img'))
    wrapper.setAttribute('aria-hidden', 'true')
    wrapper.setAttribute('class', 'cm-embed-link')
    wrapper.setAttribute('data-url', this.url)
    img.src = 'static://img/link-outline.png'
    img.setAttribute('class', 'emoji')
    img.setAttribute('data-url', this.url)
    return wrapper
  }

  ignoreEvent() {
    return false
  }
}

function embedLink(view: EditorView) {
  const decos: Range<Decoration>[] = []

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: node => {
        if (node.name === 'Link') {
          const pat = /^\[.*\]\((.+)\)$/
          const slicString = view.state.doc.sliceString(node.from, node.to)
          const match = pat.exec(slicString)
          if (!match) return
          const embed = Decoration.widget({
            widget: new Link(match[1])
          })
          decos.push({
            from: node.to,
            to: node.to,
            value: embed
          })
        }
      }
    })
  }

  return RangeSet.of(decos, true)
}

const plugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = embedLink(view)
    }

    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        syntaxTree(update.startState) != syntaxTree(update.state)
      ) {
        this.decorations = embedLink(update.view)
      }
    }
  },
  {
    decorations: v => v.decorations,
    eventHandlers: {
      mousedown: (e, _view) => {
        const wrapper = e.target as HTMLElement
        if (!['SPAN', 'IMG'].includes(wrapper.tagName)) return

        const data = wrapper.dataset
        if (!data.url) return

        // some code to open url by system browser
        Post(
          'render-to-main',
          {
            type: 'open-url-link',
            data: {
              url: data.url
            }
          },
          true
        )
      }
    }
  }
)

export const linkPlugin = (): Extension => [theme, plugin]
