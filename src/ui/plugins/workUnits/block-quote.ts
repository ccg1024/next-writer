import { Extension, Range } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'
import {
  ProcessDecorationUnit,
  ProcessDecorationUpdateUnit,
  ProcessInitUnit,
  ScheduleUnit
} from '../schedulerDefine'

class BlockQuotePlugin implements ScheduleUnit {
  private stageDecos: Range<Decoration>[]
  theme: Extension = EditorView.baseTheme({
    '.cm-content > .cm-quote-block': {
      backgroundColor: 'rgba(226,232,240,0.5)'
    },
    '.cm-content > .cm-quote-block-start': {
      paddingTop: '5px'
    },
    '.cm-content > .cm-quote-block-end': {
      paddingBottom: '5px'
    },
    '.cm-inner-quote': {
      paddingLeft: '5px',
      paddingRight: '5px',
      display: 'inline-block',
      boxSizing: 'border-box'
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
    if (node.name === 'Blockquote') {
      for (let pos = node.from; pos <= node.to; ) {
        const line = view.state.doc.lineAt(pos)
        workInDecos.push({
          from: line.from,
          to: line.from,
          value: Decoration.line({
            class: 'cm-quote-block'
          })
        })
        workInDecos.push({
          from: line.from,
          to: line.to,
          value: Decoration.mark({
            class: 'cm-inner-quote'
          })
        })
        pos = line.to + 1
      }

      const startLine = view.state.doc.lineAt(node.from)
      const endLine = view.state.doc.lineAt(node.to)
      workInDecos.push({
        from: startLine.from,
        to: startLine.from,
        value: Decoration.line({
          class: 'cm-quote-block-start'
        })
      })
      workInDecos.push({
        from: endLine.from,
        to: endLine.from,
        value: Decoration.line({
          class: 'cm-quote-block-end'
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

export default new BlockQuotePlugin()
