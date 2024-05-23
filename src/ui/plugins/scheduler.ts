// Scheduling different types of plugins

import { syntaxTree } from '@codemirror/language'
import { Extension, Range, RangeSet } from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewUpdate
} from '@codemirror/view'
import {
  ProcessDecorationFilterUnit,
  ProcessDecorationUnit,
  ProcessDecorationUpdateUnit,
  ProcessEventHandlerUnit,
  ProcessInitUnit
} from './schedulerDefine'

export default class Scheduler {
  private themes: Extension[]
  private processInitUnits: ProcessInitUnit[]
  private processDecorationUnits: ProcessDecorationUnit[]
  private processDecorationUpdateUnits: ProcessDecorationUpdateUnit[]
  private processDecorationFilterUnits: ProcessDecorationFilterUnit[]

  private processEventHandlerUnits: ProcessEventHandlerUnit[]

  constructor() {
    this.themes = []
    this.processInitUnits = []
    this.processDecorationUnits = []
    this.processDecorationUpdateUnits = []
    this.processDecorationFilterUnits = []

    this.processEventHandlerUnits = []
  }
  getThemes() {
    return this.themes
  }
  getEventHandlerUnits() {
    return this.processEventHandlerUnits
  }
  needFilter(): boolean {
    return this.processDecorationFilterUnits.length > 0
  }
  /**
   * Calling each plugin init function, should invoke before `processDecoration`
   */
  processInitUnit() {
    for (let i = 0; i < this.processInitUnits.length; i++) {
      this.processInitUnits[i]()
    }
  }
  processUnit(view: EditorView, taskQueue: ProcessDecorationUnit[]) {
    const workInDecos: Range<Decoration>[] = []
    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter(node) {
          taskQueue.forEach(task => {
            workInDecos.push(...task(view, node))
          })
        }
      })
    }
    return workInDecos
  }

  processDecoration(view: EditorView) {
    // run plugin work processing unit
    return RangeSet.of(
      this.processUnit(view, this.processDecorationUnits),
      true
    )
  }

  processDecorationUpdate(update: ViewUpdate, syntaxTreeChanged: boolean) {
    const workInDecos: Range<Decoration>[] = []
    const shouldUpdateTasks: ProcessDecorationUnit[] = []

    // filter tasks that need to be updated and tasks that do not need to be updated
    for (let i = 0; i < this.processDecorationUpdateUnits.length; i++) {
      const updateUnit = this.processDecorationUpdateUnits[i](
        update,
        syntaxTreeChanged
      )
      if (updateUnit.shouldUpdate) {
        shouldUpdateTasks.push(updateUnit.processWorker)
        continue
      }
      workInDecos.push(...updateUnit.preDecorations)
    }

    // update the remaining decorations
    workInDecos.push(...this.processUnit(update.view, shouldUpdateTasks))
    return RangeSet.of(workInDecos, true)
  }

  processDecorationFilter(update: ViewUpdate, decorations: DecorationSet) {
    // run plugin work processing filter unit
    let decos = decorations
    for (let i = 0; i < this.processDecorationFilterUnits.length; i++) {
      decos = this.processDecorationFilterUnits[i](update, decos)
    }
    return decos
  }
  registerThemes(themes: Extension[]) {
    this.themes.push(...themes)
  }
  registerInitUnits(units: ProcessInitUnit[]) {
    this.processInitUnits.push(...units)
  }
  registerDecorationUnits(units: ProcessDecorationUnit[]) {
    this.processDecorationUnits.push(...units)
  }
  registerDecorationUpdateUnits(units: ProcessDecorationUpdateUnit[]) {
    this.processDecorationUpdateUnits.push(...units)
  }
  registerDecorationFilterUnits(units: ProcessDecorationFilterUnit[]) {
    this.processDecorationFilterUnits.push(...units)
  }

  registerEventHandlerUnits(units: ProcessEventHandlerUnit[]) {
    this.processEventHandlerUnits.push(...units)
  }
}
