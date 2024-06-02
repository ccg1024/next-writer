import { syntaxTree } from '@codemirror/language'
import { EditorSelection } from '@codemirror/state'
import { EditorView, KeyBinding } from '@codemirror/view'
import { unified } from 'unified'
import remarkStringify from 'remark-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import stringWidth from 'string-width'

type InsertOption = {
  autoFocus?: boolean
}

const insert = (view: EditorView, text: string, move = 0) => {
  if (!view || !view.hasFocus || !text) return false

  const cursor = view.state.selection.main.from

  view.dispatch({
    changes: {
      from: cursor,
      insert: text
    },
    selection: {
      anchor: cursor + move
    }
  })

  return true
}
const inlineMarkToggle = (opt: {
  view: EditorView
  text: string
  offset: number
  markName: string
  opt?: InsertOption
}) => {
  const { view, text, offset, markName } = opt
  if (opt.opt?.autoFocus) view.focus()

  if (view.state.selection.main.empty)
    return insert(view, text.repeat(2), offset)

  // if select some text
  const { from } = view.state.selection.main
  const { node } = syntaxTree(view.state).resolve(from)
  if (node.name === markName) {
    // remove mark
    view.dispatch(
      view.state.changeByRange(range => {
        return {
          range: EditorSelection.range(range.from - offset, range.to - offset),
          changes: [
            { from: range.from - offset, to: range.from, insert: '' },
            { from: range.to, to: range.to + offset, insert: '' }
          ]
        }
      })
    )
    return true
  }

  // else addd mark
  view.dispatch(
    view.state.changeByRange(range => {
      return {
        range: EditorSelection.range(range.from + offset, range.to + offset),
        changes: [
          { from: range.from, insert: text },
          { from: range.to, insert: text }
        ]
      }
    })
  )
  return true
}

export const insertBold = (view: EditorView, opt?: InsertOption) => {
  return inlineMarkToggle({
    view,
    text: '**',
    offset: 2,
    markName: 'StrongEmphasis',
    opt
  })
}

export const insertItalic = (view: EditorView, opt?: InsertOption) => {
  return inlineMarkToggle({
    view,
    text: '*',
    offset: 1,
    markName: 'Emphasis',
    opt
  })
}

export const insertCode = (view: EditorView, opt?: InsertOption) => {
  return inlineMarkToggle({
    view,
    text: '`',
    offset: 1,
    markName: 'InlineCode',
    opt
  })
}

export const insertBlockCode = (view: EditorView, opt?: InsertOption) => {
  if (opt?.autoFocus) view.focus()

  const cursor = view.state.selection.main.from
  const line = view.state.doc.lineAt(cursor)
  if (line.text.length > 0) {
    view.dispatch({
      selection: { anchor: line.to }
    })
    return insert(view, '\n\n```\n```', 5)
  }

  return insert(view, '```\n```', 3)
}

const moveForward = (view: EditorView) => {
  if (!view || !view.hasFocus) return false
  const cursor = view.state.selection.main.from
  const { node } = syntaxTree(view.state).resolve(cursor)
  if (['Emphasis', 'StrongEmphasis', 'InlineCode'].includes(node.name)) {
    view.dispatch({
      selection: {
        anchor: node.to
      }
    })
  } else {
    const len = view.state.doc.length
    if (cursor < len) {
      view.dispatch({
        selection: {
          anchor: cursor + 1
        }
      })
    }
  }
  return true
}
const formatSelection = (view: EditorView) => {
  if (!view.state.selection.main.empty) {
    const { from, to } = view.state.selection.main
    const text = view.state.doc.sliceString(from, to)
    const file = unified()
      .use(remarkParse)
      .use(remarkGfm, { stringLength: stringWidth })
      .use(remarkStringify)
      .processSync(text)

    const replaceText = file.value.toString().slice(0, file.value.length - 1)
    view.dispatch(
      view.state.changeByRange(range => {
        return {
          range: EditorSelection.range(
            range.from,
            range.from + replaceText.length
          ),
          changes: [
            { from: range.from, to: range.to, insert: '' },
            { from: range.from, insert: replaceText }
          ]
        }
      })
    )
  }
  return true
}

export const nextWriterKeymap: readonly KeyBinding[] = [
  { key: 'Ctrl-b', run: insertBold },
  { key: 'Ctrl-i', run: insertItalic },
  { key: 'Ctrl-k', run: insertCode },
  { key: 'Ctrl-Shift-k', run: insertBlockCode },
  { key: 'Ctrl-f', run: moveForward },
  { key: 'Ctrl-p', run: formatSelection }
]
