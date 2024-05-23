import { syntaxTree } from '@codemirror/language'
import { Extension } from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate
} from '@codemirror/view'
import Scheduler from './scheduler'
import listAlignMarkPlugin from './workUnits/list-align-mark'

const scheduler = new Scheduler()

scheduler.registerThemes([listAlignMarkPlugin.theme])
scheduler.registerInitUnits([listAlignMarkPlugin.init])
scheduler.registerDecorationUnits([listAlignMarkPlugin.processDecorationUnit])
scheduler.registerDecorationUpdateUnits([
  listAlignMarkPlugin.processDecorationUpdateUnit
])
scheduler.registerDecorationFilterUnits([])
scheduler.registerEventHandlerUnits([])

const viewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    stageDecorations: DecorationSet
    constructor(view: EditorView) {
      // run scheduler init task queue before deal with decoration
      scheduler.processInitUnit()
      this.decorations = scheduler.processDecoration(view)
      this.stageDecorations = this.decorations
    }
    update(update: ViewUpdate) {
      this.decorations = scheduler.processDecorationUpdate(
        update,
        syntaxTree(update.startState) != syntaxTree(update.state)
      )
      this.stageDecorations = this.decorations
      if (scheduler.needFilter()) {
        this.decorations = scheduler.processDecorationFilter(
          update,
          this.stageDecorations
        )
      }
    }
    destroy() {
      this.decorations = null
      this.stageDecorations = null
    }
  },
  {
    decorations: v => v.decorations,
    provide: plugin =>
      EditorView.atomicRanges.of(
        view => view.plugin(plugin)?.decorations || Decoration.none
      )
  }
)
export const viewAtomicScheduler = (): Extension => {
  return [...scheduler.getThemes(), viewPlugin]
}
