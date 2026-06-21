import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { Line } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { HeadField, outlintField } from 'src/ui/plugins/fieldPlugin/outline';

type RenderHeadField = HeadField & {
  renderLevel: number;
};

type EditorState = {
  editor: EditorView;
  headList: RenderHeadField[];
};

type EditorAction = { type: 'set-editor'; editor: EditorView } | { type: 'set-head-list'; headList: RenderHeadField[] };

type EditorActions = {
  setEditorView: (editor: EditorView) => void;
  syncOutlineFromView: (view: EditorView) => void;
  scrollToLine: (line: Line) => void;
};

const EditorStateContext = createContext<EditorState | null>(null);
const EditorActionsContext = createContext<EditorActions | null>(null);

const initialEditorState: EditorState = {
  editor: null,
  headList: []
};

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'set-editor':
      return { ...state, editor: action.editor };
    case 'set-head-list':
      return { ...state, headList: action.headList };
    default:
      return state;
  }
}

export function EditorProvider({ children }: React.PropsWithChildren) {
  const [state, dispatch] = useReducer(editorReducer, initialEditorState);

  const setEditorView = useCallback((editor: EditorView) => {
    dispatch({ type: 'set-editor', editor });
  }, []);

  const syncOutlineFromView = useCallback((view: EditorView) => {
    if (!view) {
      dispatch({ type: 'set-head-list', headList: [] });
      return;
    }

    const field = view.state.field(outlintField);
    const tiers: number[] = [];
    field.forEach(f => {
      if (!tiers.includes(f.level)) {
        tiers.push(f.level);
      }
    });
    tiers.sort();
    dispatch({
      type: 'set-head-list',
      headList: field.map(f => ({ ...f, text: f.text.replace(/^#+ /, ''), renderLevel: tiers.indexOf(f.level) }))
    });
  }, []);

  const scrollToLine = useCallback(
    (line: Line) => {
      if (!line || !state.editor) {
        return;
      }

      state.editor.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, {
          y: 'start',
          yMargin: 17.5
        })
      });
    },
    [state.editor]
  );

  const actions = useMemo<EditorActions>(
    () => ({ setEditorView, syncOutlineFromView, scrollToLine }),
    [scrollToLine, setEditorView, syncOutlineFromView]
  );

  return (
    <EditorStateContext.Provider value={state}>
      <EditorActionsContext.Provider value={actions}>{children}</EditorActionsContext.Provider>
    </EditorStateContext.Provider>
  );
}

export function useEditorState() {
  const state = useContext(EditorStateContext);
  if (!state) {
    throw new Error('useEditorState must be used within EditorProvider');
  }
  return state;
}

export function useEditorActions() {
  const actions = useContext(EditorActionsContext);
  if (!actions) {
    throw new Error('useEditorActions must be used within EditorProvider');
  }
  return actions;
}
