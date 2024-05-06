import { syntaxTree } from '@codemirror/language'
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
const insertBold = (view: EditorView) => {
  return insert(view, '****', 2)
}

const insertItalic = (view: EditorView) => {
  return insert(view, '**', 1)
}

const insertCode = (view: EditorView) => {
  return insert(view, '``', 1)
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
