// scheduler normal view plugin
import { syntaxTree } from '@codemirror/language'
import { Extension } from '@codemirror/state'
import {
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate
} from '@codemirror/view'
import Scheduler from './scheduler'
import codeBlockPlugin from './workUnits/code-block'
import titleTagPlugin from './workUnits/title-tag'
import blockQuotePlugin from './workUnits/block-quote'
import hideMarksPlugin from './workUnits/hide-marks'
import linkTagPlugin from './workUnits/link-tag'
import listAlignPlugin from './workUnits/list-align'

const scheduler = new Scheduler()

scheduler.registerThemes([
  codeBlockPlugin.theme,
  titleTagPlugin.theme,
  blockQuotePlugin.theme,
  hideMarksPlugin.theme,
  linkTagPlugin.theme
])
scheduler.registerInitUnits([
  codeBlockPlugin.init,
  titleTagPlugin.init,
  blockQuotePlugin.init,
  hideMarksPlugin.init,
  linkTagPlugin.init,
  listAlignPlugin.init
])
scheduler.registerDecorationUnits([
  codeBlockPlugin.processDecorationUnit,
  titleTagPlugin.processDecorationUnit,
  blockQuotePlugin.processDecorationUnit,
  hideMarksPlugin.processDecorationUnit,
  linkTagPlugin.processDecorationUnit,
  listAlignPlugin.processDecorationUnit
])
scheduler.registerDecorationUpdateUnits([
  codeBlockPlugin.processDecorationUpdateUnit,
  titleTagPlugin.processDecorationUpdateUnit,
  blockQuotePlugin.processDecorationUpdateUnit,
  hideMarksPlugin.processDecorationUpdateUnit,
  linkTagPlugin.processDecorationUpdateUnit,
  listAlignPlugin.processDecorationUpdateUnit
])
scheduler.registerDecorationFilterUnits([
  hideMarksPlugin.processDecorationFilterUnit
])
scheduler.registerEventHandlerUnits([...linkTagPlugin.processEventHandlerUnits])

const viewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    stageDecorations: DecorationSet
    constructor(view: EditorView) {
      // run scheduler init task queue before deal with first decoration
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
    eventHandlers: {
      click(e, view) {
        e.stopPropagation()
        const eventHandlerUnits = scheduler.getEventHandlerUnits()
        for (let i = 0; i < eventHandlerUnits.length; i++) {
          if (eventHandlerUnits[i].name === 'click') {
            eventHandlerUnits[i].callback(e, view)
          }
        }
      }
    }
  }
)
export const viewScheduler = (): Extension => {
  return [...scheduler.getThemes(), viewPlugin]
}
