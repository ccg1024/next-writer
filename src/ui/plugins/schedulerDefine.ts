import { Extension, Range } from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewUpdate
} from '@codemirror/view'

export type SimpleNodeRef = {
  name: string
  from: number
  to: number
}
export type ProcessInitUnit = (...args: unknown[]) => void
export type ProcessDecorationUnit = (
  view: EditorView,
  node: SimpleNodeRef
) => Range<Decoration>[]
export type ProcessDecorationFilterUnit = (
  update: ViewUpdate,
  decorations: DecorationSet
) => DecorationSet
export type ProcessEventHandlerUnit = {
  name: string
  callback: (event: Event, view: EditorView) => void
}

/**
 * if `shouldUpdate==true`, need return with `processWorker`,
 * else, with `preDecorations`
 */
export type ProcessDecorationUpdateUnit = (
  update: ViewUpdate,
  syntaxTreeChanged: boolean
) => {
  shouldUpdate: boolean
  processWorker: ProcessDecorationUnit
  preDecorations: Range<Decoration>[]
}

export interface ScheduleUnit {
  init: ProcessInitUnit
  theme?: Extension
  preProcessWorkUnit?: () => void
  processDecorationUnit: ProcessDecorationUnit
  processDecorationFilterUnit?: ProcessDecorationFilterUnit
  processDecorationUpdateUnit: ProcessDecorationUpdateUnit
  processEventHandlerUnits?: ProcessEventHandlerUnit[]
  afterProcessWorkUnit?: () => void
}
