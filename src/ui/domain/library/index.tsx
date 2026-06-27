import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { RendererLibraryNode, RendererLibraryTree, RendererRootLibraryTree } from '_types';
import { ROOT_LIBRARY_ID } from 'src/config/env';
import rendererGateway from 'src/ui/shared/ipc/renderer-gateway';
import { RendererTreeOperation } from 'src/ui/libs/renderer-tree';
import { LibraryNodePatch, LibraryNodeProducer, LibraryStateContainer } from './library-state-container';

export type LibraryState = {
  libraryTree: RendererRootLibraryTree;
  currentLib: RendererLibraryTree;
  currentNote: RendererLibraryTree;
};

type LibraryAction =
  | { type: 'fresh-tree' }
  | { type: 'set-current-lib'; node: RendererLibraryTree }
  | { type: 'set-current-note'; node: RendererLibraryTree }
  | { type: 'set-library-tree'; tree: RendererRootLibraryTree }
  | { type: 'patch-current-note'; patch: LibraryNodePatch }
  | { type: 'patch-library-node'; node: RendererLibraryTree; patch: LibraryNodePatch }
  | { type: 'append-library-child'; parent: RendererLibraryNode; child: RendererLibraryTree }
  | {
      type: 'update-node';
      newNode: LibraryNodeProducer;
      operation: RendererTreeOperation;
    };

export type LibraryActions = {
  setLibraryTree: (tree: RendererRootLibraryTree) => void;
  setCurrentLib: (node: RendererLibraryTree) => void;
  setCurrentNote: (node: RendererLibraryTree) => void;
  freshTree: () => void;
  updateRenderLibrary: (newNode: LibraryNodeProducer, type?: RendererTreeOperation) => void;
  patchCurrentNote: (patch: LibraryNodePatch) => void;
  patchLibraryNode: (node: RendererLibraryTree, patch: LibraryNodePatch) => void;
  appendLibraryChild: (parent: RendererLibraryNode, child: RendererLibraryTree) => void;
  createLibrary: (name: string) => ReturnType<typeof rendererGateway.updateLib>;
  renameLibrary: (lib: RendererLibraryTree, newName: string) => ReturnType<typeof rendererGateway.updateLib>;
  renameNode: (node: RendererLibraryTree, newName: string) => ReturnType<typeof rendererGateway.updateLib>;
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
  const container = LibraryStateContainer.of(state);

  switch (action.type) {
    case 'set-library-tree':
      return container.setLibraryTree(action.tree).value();
    case 'set-current-lib':
      return container.setCurrentLib(action.node).value();
    case 'set-current-note':
      return container.setCurrentNote(action.node).value();
    case 'fresh-tree':
      return container.refreshTree().value();
    case 'update-node':
      return container.updateNode(action.newNode, action.operation).value();
    case 'patch-current-note':
      return container.patchCurrentNote(action.patch).value();
    case 'patch-library-node':
      return container.patchNode(action.node, action.patch).value();
    case 'append-library-child':
      return container.appendChild(action.parent, action.child).value();
    default:
      return state;
  }
}

export function LibraryProvider({ children }: React.PropsWithChildren) {
  const [state, dispatch] = useReducer(libraryReducer, initialLibraryState);

  const setLibraryTree = useCallback((tree: RendererRootLibraryTree) => {
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

  const patchCurrentNote = useCallback((patch: LibraryNodePatch) => {
    dispatch({ type: 'patch-current-note', patch });
  }, []);

  const patchLibraryNode = useCallback((node: RendererLibraryTree, patch: LibraryNodePatch) => {
    dispatch({ type: 'patch-library-node', node, patch });
  }, []);

  const appendLibraryChild = useCallback((parent: RendererLibraryNode, child: RendererLibraryTree) => {
    dispatch({ type: 'append-library-child', parent, child });
  }, []);

  const actions = useMemo<LibraryActions>(
    () => ({
      setLibraryTree,
      setCurrentLib,
      setCurrentNote,
      freshTree,
      updateRenderLibrary,
      patchCurrentNote,
      patchLibraryNode,
      appendLibraryChild,
      createLibrary(name) {
        return rendererGateway.updateLib({ operate: 'add', type: 'folder', parentId: ROOT_LIBRARY_ID, name });
      },
      renameLibrary(lib, newName) {
        return rendererGateway.updateLib({ operate: 'rename', id: lib.id, name: newName });
      },
      renameNode(node, newName) {
        return rendererGateway.updateLib({ operate: 'rename', id: node.id, name: newName });
      },
      deleteLibrary(lib) {
        return rendererGateway.updateLib({ operate: 'del', id: lib.id });
      },
      createNote(lib, name) {
        return rendererGateway.updateLib({ operate: 'add', type: 'file', parentId: lib.id, name });
      },
      deleteNote(note) {
        return rendererGateway.updateLib({ operate: 'del', id: note.id });
      }
    }),
    [
      appendLibraryChild,
      freshTree,
      patchCurrentNote,
      patchLibraryNode,
      setCurrentLib,
      setCurrentNote,
      setLibraryTree,
      updateRenderLibrary
    ]
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
