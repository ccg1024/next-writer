import { css } from '@emotion/css'
import { Range } from '@codemirror/state'
import { Decoration } from '@codemirror/view'
import {
  ProcessDecorationUnit,
  ProcessDecorationUpdateUnit,
  ProcessInitUnit,
  ScheduleUnit
} from '../schedulerDefine'

type MarkWidth = {
  space: number
  star: number
  dash: number
  plus: number
  zero: number
  dot: number
}
function getMarkWidth(): MarkWidth {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const fontSize = window._next_writer_rendererConfig.fontSize
  const fontFamily = window._next_writer_rendererConfig.fontFamily
  ctx.font = `${fontSize} ${fontFamily}`

  const numFontSize = parseInt(fontSize.slice(0, fontSize.length - 2))
  const letterSpacing = getComputedStyle(
    document.documentElement
  ).getPropertyValue('--nw-letter-spacing')
  const numLetterSpacing = +letterSpacing.slice(0, letterSpacing.length - 2)
  const additionSpacing = isNaN(numLetterSpacing * numFontSize)
    ? 0
    : numLetterSpacing * numFontSize

  const space = ctx.measureText(' ')
  const star = ctx.measureText('*')
  const dash = ctx.measureText('-')
  const plus = ctx.measureText('+')
  const zero = ctx.measureText('0')
  const dot = ctx.measureText('.')

  return {
    space: Math.floor(space.width) + additionSpacing,
    star: Math.floor(star.width) + additionSpacing,
    dash: Math.floor(dash.width) + additionSpacing,
    plus: Math.floor(plus.width) + additionSpacing,
    zero: Math.floor(zero.width) + additionSpacing,
    dot: Math.floor(dot.width) + additionSpacing
  }
}

class ListAlign implements ScheduleUnit {
  private stageDeocs: Range<Decoration>[]
  private markWidth: MarkWidth

  init: ProcessInitUnit = () => {
    this.stageDeocs = []
    this.markWidth = getMarkWidth()
  }

  processDecorationUnit: ProcessDecorationUnit = (view, node) => {
    const workInDecos: Range<Decoration>[] = []
    if (node.name === 'ListMark') {
      const line = view.state.doc.lineAt(node.from)
      if (line.to - node.to == 0) return workInDecos

      const offset = node.to - line.from + 1
      const mark = view.state.doc.sliceString(node.from, node.to)
      const isNumber = !['-', '*', '+'].includes(mark)
      const _markWidth = isNumber
        ? (mark.length - 1) * this.markWidth.zero + this.markWidth.dot + 2 // As same as below comment
        : '-' === mark
          ? this.markWidth.dash
          : '*' === mark
            ? this.markWidth.star
            : this.markWidth.plus
      const spaceWidth = offset - mark.length
      const lineCls = css({
        position: 'relative',
        marginInlineStart: `${_markWidth + spaceWidth * this.markWidth.space + 2}px`
      })
      workInDecos.push({
        from: line.from,
        to: line.from,
        value: Decoration.line({
          class: lineCls
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

export default new ListAlign()
