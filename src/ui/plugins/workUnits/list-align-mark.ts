import { Extension, Range } from '@codemirror/state'
import { Decoration, EditorView, WidgetType } from '@codemirror/view'
import {
  ProcessDecorationUnit,
  ProcessDecorationUpdateUnit,
  ProcessInitUnit,
  ScheduleUnit
} from '../schedulerDefine'

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

class ListAlignMark implements ScheduleUnit {
  private stageDeocs: Range<Decoration>[]

  theme: Extension = EditorView.baseTheme({
    '.cm-list-mark-absolute': {
      position: 'absolute',
      transform: 'translateX(-100%)',
      color: '#4299E1',
      fontWeight: 'bold'
    }
  })
  init: ProcessInitUnit = () => {
    this.stageDeocs = []
  }

  processDecorationUnit: ProcessDecorationUnit = (view, node) => {
    const workInDecos: Range<Decoration>[] = []

    if (node.name == 'ListMark') {
      const line = view.state.doc.lineAt(node.from)
      if (line.to - node.to == 0) return workInDecos

      workInDecos.push({
        from: line.from,
        to: node.to + 1,
        value: Decoration.replace({
          widget: new ListMark(
            view.state.doc.sliceString(node.from, node.to + 1)
          )
        })
      })
    }

    this.stageDeocs.push(...workInDecos)
    return workInDecos
  }
  processDecorationUpdateUnit: ProcessDecorationUpdateUnit = (
    update,
    syntaxTreeChanged
  ) => {
    const shouldUpdate =
      update.docChanged || update.viewportChanged || syntaxTreeChanged

    if (shouldUpdate) {
      this.stageDeocs = []
    }

    return {
      shouldUpdate,
      processWorker: this.processDecorationUnit,
      preDecorations: this.stageDeocs
    }
  }
}

export default new ListAlignMark()
