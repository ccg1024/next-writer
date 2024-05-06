// This plugin will indent and align list content based on current font size and font family
// @author: crazycodegame
import { css } from '@emotion/css'
import { ensureSyntaxTree } from '@codemirror/language'
import { Extension, Range, RangeSet } from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType
} from '@codemirror/view'

const theme = EditorView.baseTheme({
  '.cm-list-mark-absolute': {
    position: 'absolute',
    transform: 'translateX(-100%)',
    color: '#4299E1',
    fontWeight: 'bold'
  }
})

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
  ctx.font = `${window._next_writer_rendererConfig.fontSize} ${window._next_writer_rendererConfig.fontFamily}`
  const space = ctx.measureText(' ')
  const star = ctx.measureText('*')
  const dash = ctx.measureText('-')
  const plus = ctx.measureText('+')
  const zero = ctx.measureText('0')
  const dot = ctx.measureText('.')

  return {
    space: Math.floor(space.width),
    star: Math.floor(star.width),
    dash: Math.floor(dash.width),
    plus: Math.floor(plus.width),
    zero: Math.floor(zero.width),
    dot: Math.floor(dot.width)
  }
}
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

const updateDeco = (view: EditorView, markWidth: MarkWidth) => {
  const deco: Range<Decoration>[] = []
  for (const { from, to } of view.visibleRanges) {
    ensureSyntaxTree(view.state, to, 200).iterate({
      from,
      to,
      enter: node => {
        if (node.name === 'ListMark') {
          const line = view.state.doc.lineAt(node.from)
          if (line.to - node.to == 0) return

          const offset = node.to - line.from + 1
          const mark = view.state.doc.sliceString(node.from, node.to)
          const isNumber = !['-', '*', '+'].includes(mark)
          const _markWidth = isNumber
            ? (mark.length - 1) * markWidth.zero + markWidth.dot + 2 // As same as below comment
            : '-' === mark
              ? markWidth.dash
              : '*' === mark
                ? markWidth.star
                : markWidth.plus
          const spaceWidth = offset - mark.length

          // Since `Math.floor` is used when calculating the font width,
          // 2 pixels are used to fix it here to avoid the mark, like `1.`,
          // from overflowing and changing lines when using a number list.
          const lineCls = css({
            position: 'relative',
            marginInlineStart: `${_markWidth + spaceWidth * markWidth.space + 2}px`
          })
          deco.push({
            from: line.from,
            to: line.from,
            value: Decoration.line({
              class: lineCls
            })
          })
          deco.push({
            from: line.from,
            to: node.to + 1,
            value: Decoration.replace({
              widget: new ListMark(
                view.state.doc.sliceString(node.from, node.to + 1)
              )
            })
          })
        }
      }
    })
  }

  return RangeSet.of(deco, true)
}

const plugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    markWidth: MarkWidth
    constructor(view: EditorView) {
      this.markWidth = getMarkWidth()
      this.decorations = updateDeco(view, this.markWidth)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = updateDeco(update.view, this.markWidth)
      }
    }

    destroy() {
      this.decorations = null
    }
  },
  {
    decorations: v => v.decorations,
    provide: plugin =>
      EditorView.atomicRanges.of(view => {
        return view.plugin(plugin)?.decorations || Decoration.none
      })
  }
)

export const prettierList = (): Extension => [theme, plugin]
