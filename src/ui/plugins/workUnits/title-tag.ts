import { Extension, Range } from '@codemirror/state'
import { Decoration, EditorView, WidgetType } from '@codemirror/view'
import {
  ProcessDecorationUnit,
  ProcessDecorationUpdateUnit,
  ProcessInitUnit,
  ScheduleUnit
} from '../schedulerDefine'

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
    span.className = 'cm-title-tag'
    return span
  }
}

class TitleTagPlugin implements ScheduleUnit {
  private _headList = [
    'ATXHeading1',
    'ATXHeading2',
    'ATXHeading3',
    'ATXHeading4',
    'ATXHeading5',
    'ATXHeading6'
  ]
  private stageDecos: Range<Decoration>[]
  theme: Extension = EditorView.baseTheme({
    '.cm-content > .cm-head-relative': {
      position: 'relative',
      boxSizing: 'border-box'
    },
    '.cm-title-tag': {
      position: 'absolute',
      left: 0,
      top: '50%',
      transform: 'translate(-100%, -50%)',
      color: '#A9BBCC'
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
    if (this._headList.includes(node.name)) {
      const headLevel = parseInt(node.name[node.name.length - 1])
      const line = view.state.doc.lineAt(node.from)
      workInDecos.push({
        from: line.from,
        to: line.from,
        value: Decoration.line({
          class: 'cm-head-relative'
        })
      })
      workInDecos.push({
        from: node.from,
        to: node.from,
        value: Decoration.widget({
          widget: new OffsetHeadMark('#'.repeat(headLevel)),
          side: -1
        })
      })
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
}

export default new TitleTagPlugin()
