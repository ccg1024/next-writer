import { Extension, Range } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'
import {
  ProcessDecorationFilterUnit,
  ProcessDecorationUnit,
  ProcessDecorationUpdateUnit,
  ProcessInitUnit,
  ScheduleUnit
} from '../schedulerDefine'

const hideDecoration = (
  from: number,
  to: number,
  additionProperty?: { [key: string]: unknown }
) => {
  const property = additionProperty
    ? { needFilter: true, ...additionProperty }
    : { needFilter: true }
  return {
    from,
    to,
    value: Decoration.replace({ ...property })
  }
}

class HideMarksPlugin implements ScheduleUnit {
  private headings = [
    'ATXHeading1',
    'ATXHeading2',
    'ATXHeading3',
    'ATXHeading4',
    'ATXHeading5',
    'ATXHeading6'
  ]
  private stageDecos: Range<Decoration>[]
  theme: Extension = EditorView.baseTheme({
    '.cm-horizontal-rule': {
      position: 'relative',
      '&:after': {
        content: '""',
        position: 'absolute',
        top: '50%',
        left: 0,
        width: '100%',
        borderTop: '2px solid #586EA5',
        transform: 'translateY(-50%)'
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
    const line = view.state.doc.lineAt(node.from)
    if (this.headings.includes(node.name)) {
      const headLevel = parseInt(node.name[node.name.length - 1])
      const diff = node.to - node.from
      if (diff > headLevel + 1) {
        workInDecos.push(hideDecoration(node.from, node.from + headLevel + 1))
      }
    } else if (node.name === 'EmphasisMark') {
      workInDecos.push(hideDecoration(node.from, node.to))
    } else if (node.name === 'InlineCode') {
      workInDecos.push(hideDecoration(node.from, node.from + 1))
      workInDecos.push(hideDecoration(node.to - 1, node.to))
    } else if (node.name === 'HorizontalRule') {
      workInDecos.push({
        from: line.from,
        to: line.from,
        value: Decoration.line({
          class: 'cm-horizontal-rule',
          needFilter: true
        })
      })
      workInDecos.push(hideDecoration(node.from, node.to))
    } else if (node.name === 'Link') {
      const sliceString = view.state.doc.sliceString(node.from, node.to)
      const pat = /^\[(.*)\]\((.*)\)/
      const match = pat.exec(sliceString)
      if (match && match[2].length !== 0) {
        // hide link url
        workInDecos.push(
          hideDecoration(node.from + match[1].length + 2, node.to)
        )
      }
    }

    // store all decoration of this plugin
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
  processDecorationFilterUnit: ProcessDecorationFilterUnit = (
    update,
    decorations
  ) => {
    const curRange = update.view.state.selection.ranges
    if (curRange == undefined) return decorations

    const line = update.view.state.doc.lineAt(curRange[0].from)

    return decorations.update({
      filter(from, _to, value) {
        // if the decoration do not filter, just return
        if (!value.spec.needFilter) return true

        const decoLine = update.view.state.doc.lineAt(from)
        if (decoLine.from == line.from) return false

        return true
      }
    })
  }
}

export default new HideMarksPlugin()
