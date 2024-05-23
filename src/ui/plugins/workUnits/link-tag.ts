import { Extension, Range } from '@codemirror/state'
import { Decoration, EditorView, WidgetType } from '@codemirror/view'
import { ONE_WAY_CHANNEL } from 'src/config/ipc'
import { Post } from 'src/ui/libs/utils'
import {
  ProcessDecorationUnit,
  ProcessDecorationUpdateUnit,
  ProcessEventHandlerUnit,
  ProcessInitUnit,
  ScheduleUnit
} from '../schedulerDefine'

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

// show click-able widget to open url with default browser
class LinkTag implements ScheduleUnit {
  private stageDecos: Range<Decoration>[]
  theme: Extension = EditorView.baseTheme({
    '.cm-embed-link': {
      '&:hover': {
        cursor: 'pointer'
      }
    }
  })

  constructor() {
    this.init()
  }
  init: ProcessInitUnit = () => {
    this.stageDecos = []
  }
  processDecorationUnit: ProcessDecorationUnit = (view, node) => {
    const workInDecos: Range<Decoration>[] = []

    if (node.name === 'Link') {
      const pat = /^\[.*\]\((.+)\)$/
      const slicString = view.state.doc.sliceString(node.from, node.to)
      const match = pat.exec(slicString)
      if (match) {
        const embed = Decoration.widget({
          widget: new Link(match[1])
        })
        workInDecos.push({
          from: node.to,
          to: node.to,
          value: embed
        })
      }
    }

    this.stageDecos.push(...workInDecos)
    return workInDecos
  }
  processDecorationUpdateUnit: ProcessDecorationUpdateUnit = (
    update,
    syntaxTreeChanged
  ) => {
    const shouldUpdate =
      update.docChanged || update.viewportChanged || syntaxTreeChanged
    if (shouldUpdate) {
      this.stageDecos = []
    }

    return {
      shouldUpdate,
      processWorker: this.processDecorationUnit,
      preDecorations: this.stageDecos
    }
  }
  processEventHandlerUnits: ProcessEventHandlerUnit[] = [
    {
      name: 'click',
      callback: (e, _view) => {
        const wrapper = e.target as HTMLElement
        if (!['SPAN', 'IMG'].includes(wrapper.tagName)) return

        const data = wrapper.dataset
        if (!data.url) return

        // open url by system browser
        Post(
          ONE_WAY_CHANNEL,
          { type: 'open-url-link', data: { url: data.url } },
          true
        )
      }
    }
  ]
}

export default new LinkTag()
