import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { RendererLibraryTree } from '_types';
import rendererGateway from 'src/ui/shared/ipc/renderer-gateway';
import {
  findRendererNodeById,
  refreshRendererTree,
  RendererTreeOperation,
  updateRendererTree
} from 'src/ui/libs/renderer-tree';

export type LibraryState = {
  libraryTree: RendererLibraryTree;
  currentLib: RendererLibraryTree;
  currentNote: RendererLibraryTree;
};

type LibraryAction =
  | { type: 'fresh-tree' }
  | { type: 'set-current-lib'; node: RendererLibraryTree }
  | { type: 'set-current-note'; node: RendererLibraryTree }
  | { type: 'set-library-tree'; tree: RendererLibraryTree }
  | {
      type: 'update-node';
      newNode:
        | RendererLibraryTree
        | ((preLib: RendererLibraryTree, preNote: RendererLibraryTree) => RendererLibraryTree);
      operation: RendererTreeOperation;
    };

export type LibraryActions = {
  setLibraryTree: (tree: RendererLibraryTree) => void;
  setCurrentLib: (node: RendererLibraryTree) => void;
  setCurrentNote: (node: RendererLibraryTree) => void;
  freshTree: () => void;
  updateRenderLibrary: (
    newNode: RendererLibraryTree | ((preLib: RendererLibraryTree, preNote: RendererLibraryTree) => RendererLibraryTree),
    type?: RendererTreeOperation
  ) => void;
  createLibrary: (name: string) => ReturnType<typeof rendererGateway.updateLib>;
  renameLibrary: (lib: RendererLibraryTree, newName: string) => ReturnType<typeof rendererGateway.updateLib>;
  deleteLibrary: (lib: RendererLibraryTree) => ReturnType<typeof rendererGateway.updateLib>;
  createNote: (lib: RendererLibraryTree, name: string) => ReturnType<typeof rendererGateway.updateLib>;
  deleteNote: (note: RendererLibraryTree) => ReturnType<typeof rendererGateway.updateLib>;
};

const initialLibraryState: LibraryState = {
  libraryTree: null,
  currentLib: null,
  currentNote: null
};

const LibraryStateContext = createContext<LibraryState | null>(null);
const LibraryActionsContext = createContext<LibraryActions | null>(null);

export function libraryReducer(state: LibraryState, action: LibraryAction): LibraryState {
  switch (action.type) {
    case 'set-library-tree':
      return {
        libraryTree: refreshRendererTree(action.tree),
        currentLib: null,
        currentNote: null
      };
    case 'set-current-lib':
      return { ...state, currentLib: action.node };
    case 'set-current-note':
      return { ...state, currentNote: action.node };
    case 'fresh-tree': {
      if (!state.libraryTree) {
        return state;
      }
      const libraryTree = refreshRendererTree(state.libraryTree);
      return syncSelectedNodes(state, libraryTree);
    }
    case 'update-node': {
      const innerNode =
        typeof action.newNode === 'function' ? action.newNode(state.currentLib, state.currentNote) : action.newNode;
      if (!state.libraryTree || !innerNode) {
        return state;
      }
      const libraryTree = updateRendererTree(state.libraryTree, innerNode, action.operation);
      return syncSelectedNodes(state, libraryTree);
    }
    default:
      return state;
  }
}

export function LibraryProvider({ children }: React.PropsWithChildren) {
  const [state, dispatch] = useReducer(libraryReducer, initialLibraryState);

  const setLibraryTree = useCallback((tree: RendererLibraryTree) => {
    dispatch({ type: 'set-library-tree', tree });
  }, []);

  const setCurrentLib = useCallback((node: RendererLibraryTree) => {
    dispatch({ type: 'set-current-lib', node });
  }, []);

  const setCurrentNote = useCallback((node: RendererLibraryTree) => {
    dispatch({ type: 'set-current-note', node });
  }, []);

  const freshTree = useCallback(() => {
    dispatch({ type: 'fresh-tree' });
  }, []);

  const updateRenderLibrary: LibraryActions['updateRenderLibrary'] = useCallback((newNode, type = 'update') => {
    dispatch({ type: 'update-node', newNode, operation: type });
  }, []);

  const actions = useMemo<LibraryActions>(
    () => ({
      setLibraryTree,
      setCurrentLib,
      setCurrentNote,
      freshTree,
      updateRenderLibrary,
      createLibrary(name) {
        return rendererGateway.updateLib({ operate: 'add', type: 'folder', path: `./${name}` });
      },
      renameLibrary(lib, newName) {
        return rendererGateway.updateLib({
          operate: 'update',
          type: 'folder',
          path: lib.relativePath,
          pathInRuntime: `${lib.parent.relativePath}/${newName}`
        });
      },
      deleteLibrary(lib) {
        return rendererGateway.updateLib({ operate: 'del', type: 'folder', path: lib.relativePath });
      },
      createNote(lib, name) {
        return rendererGateway.updateLib({ operate: 'add', type: 'file', path: `${lib.relativePath}/${name}` });
      },
      deleteNote(note) {
        return rendererGateway.updateLib({ operate: 'del', type: 'file', path: note.relativePath });
      }
    }),
    [freshTree, setCurrentLib, setCurrentNote, setLibraryTree, updateRenderLibrary]
  );

  return (
    <LibraryStateContext.Provider value={state}>
      <LibraryActionsContext.Provider value={actions}>{children}</LibraryActionsContext.Provider>
    </LibraryStateContext.Provider>
  );
}

export function useLibraryState() {
  const state = useContext(LibraryStateContext);
  if (!state) {
    throw new Error('useLibraryState must be used within LibraryProvider');
  }
  return state;
}

export function useLibraryActions() {
  const actions = useContext(LibraryActionsContext);
  if (!actions) {
    throw new Error('useLibraryActions must be used within LibraryProvider');
  }
  return actions;
}

function syncSelectedNodes(state: LibraryState, libraryTree: RendererLibraryTree): LibraryState {
  return {
    libraryTree,
    currentLib: findRendererNodeById(libraryTree, state.currentLib?.id),
    currentNote: findRendererNodeById(libraryTree, state.currentNote?.id)
  };
}
