import { Range } from '@codemirror/state'
import {
  ProcessDecorationUnit,
  ProcessDecorationUpdateUnit,
  ProcessInitUnit,
  ScheduleUnit
} from '../schedulerDefine'
import { Decoration, EditorView } from '@codemirror/view'

class CodeBlockPlugin implements ScheduleUnit {
  private stageDecos: Range<Decoration>[]
  theme = EditorView.baseTheme({
    '.cm-content > .cm-code-block': {
      backgroundColor: '#cccccc22',
      fontFamily: 'var(--nw-editor-code-font-family)'
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
    if (node.name === 'FencedCode') {
      for (let pos = node.from; pos <= node.to; ) {
        const line = view.state.doc.lineAt(pos)
        workInDecos.push({
          from: line.from,
          to: line.from,
          value: Decoration.line({
            class: 'cm-code-block'
          })
        })
        pos = line.to + 1
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
}

export default new CodeBlockPlugin()
