import { syntaxTree } from '@codemirror/language'
import { EditorSelection } from '@codemirror/state'
import { EditorView, KeyBinding } from '@codemirror/view'

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
}) => {
  const { view, text, offset, markName } = opt
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
const insertBold = (view: EditorView) => {
  return inlineMarkToggle({
    view,
    text: '**',
    offset: 2,
    markName: 'StrongEmphasis'
  })
}

const insertItalic = (view: EditorView) => {
  return inlineMarkToggle({
    view,
    text: '*',
    offset: 1,
    markName: 'Emphasis'
  })
}

const insertCode = (view: EditorView) => {
  return inlineMarkToggle({
    view,
    text: '`',
    offset: 1,
    markName: 'InlineCode'
  })
}

const insertBlockCode = (view: EditorView) => {
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

export const nextWriterKeymap: readonly KeyBinding[] = [
  { key: 'Ctrl-b', run: insertBold },
  { key: 'Ctrl-i', run: insertItalic },
  { key: 'Ctrl-k', run: insertCode },
  { key: 'Ctrl-Shift-k', run: insertBlockCode },
  { key: 'Ctrl-f', run: moveForward }
]
