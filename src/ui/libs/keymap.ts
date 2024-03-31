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

export const nextWriterKeymap: readonly KeyBinding[] = [
  { key: 'Ctrl-b', run: insertBold },
  { key: 'Ctrl-i', run: insertItalic },
  { key: 'Ctrl-k', run: insertCode },
  { key: 'Ctrl-Shift-k', run: insertBlockCode }
]
