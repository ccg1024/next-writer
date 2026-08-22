/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import type { EditorView } from '@codemirror/view';
import type { RendererLibraryTree, RendererRootLibraryTree, WorkspaceSearchResult } from '_types';
import rendererGateway from 'src/ui/shared/ipc/renderer-gateway';
import { WorkspaceSearch } from './workspace-search';

const mockSetCurrentLib = jest.fn();
const mockSetCurrentNote = jest.fn();
const mockLibraryState: { libraryTree: RendererRootLibraryTree; currentNote: RendererLibraryTree | null } = {
  libraryTree: null,
  currentNote: null
};
const mockEditorState: { editor: EditorView } = { editor: null };

jest.mock('src/ui/domain/library', () => ({
  useLibraryState: () => mockLibraryState,
  useLibraryActions: () => ({ setCurrentLib: mockSetCurrentLib, setCurrentNote: mockSetCurrentNote })
}));

jest.mock('src/ui/domain/editor', () => ({
  useEditorState: () => mockEditorState
}));

jest.mock('src/ui/shared/renderer-command', () => ({
  useRendererCommand: jest.fn()
}));

jest.mock('src/ui/shared/ipc/renderer-gateway', () => ({
  __esModule: true,
  default: { searchWorkspace: jest.fn() }
}));

describe('WorkspaceSearch', () => {
  const result: WorkspaceSearchResult = {
    id: 'note-id',
    path: 'drafts/note.md',
    name: 'note',
    title: 'Needle title',
    field: 'content',
    line: 2,
    column: 5,
    context: 'The needle is here',
    matchStart: 4,
    matchEnd: 10
  };
  let note: RendererLibraryTree;
  let folder: RendererLibraryTree;

  beforeAll(() => {
    const getComputedStyle = window.getComputedStyle;
    Object.defineProperty(window, 'getComputedStyle', {
      configurable: true,
      value: (element: Element) => getComputedStyle(element)
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockImplementation(() => ({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn()
      }))
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const root = { id: '__root__', children: [] } as RendererRootLibraryTree;
    folder = {
      id: 'folder-id',
      name: 'drafts',
      type: 'folder',
      birthTime: '',
      modifiedTime: '',
      children: [],
      parent: root
    };
    note = {
      id: 'note-id',
      name: 'note',
      type: 'file',
      birthTime: '',
      modifiedTime: '',
      children: [],
      parent: folder
    };
    folder.children = [note];
    root.children = [folder];
    mockLibraryState.libraryTree = root;
    mockLibraryState.currentNote = null;
    mockEditorState.editor = null;
    (rendererGateway.searchWorkspace as jest.Mock).mockResolvedValue({
      status: 0,
      data: { results: [result], total: 1, hasMore: false, indexStatus: 'ready' }
    });
  });

  it('opens a search result and locates its line after the target editor mounts', async () => {
    const onClose = jest.fn();
    const rendered = render(
      <App>
        <WorkspaceSearch open onOpen={jest.fn()} onClose={onClose} />
      </App>
    );

    fireEvent.change(screen.getByPlaceholderText('搜索文件名、标题或正文'), { target: { value: 'needle' } });
    await waitFor(() => expect(rendererGateway.searchWorkspace).toHaveBeenCalled());
    fireEvent.click(await screen.findByText('Needle title'));

    expect(mockSetCurrentLib).toHaveBeenCalledWith(folder);
    expect(mockSetCurrentNote).toHaveBeenCalledWith(note);
    expect(onClose).toHaveBeenCalled();

    const dispatch = jest.fn();
    const focus = jest.fn();
    mockLibraryState.currentNote = note;
    mockEditorState.editor = {
      state: {
        doc: {
          lines: 3,
          line: jest.fn().mockReturnValue({ from: 10, to: 30 })
        }
      },
      dispatch,
      focus
    } as unknown as EditorView;
    rendered.rerender(
      <App>
        <WorkspaceSearch open={false} onOpen={jest.fn()} onClose={onClose} />
      </App>
    );

    await waitFor(() => expect(dispatch).toHaveBeenCalled());
    expect(dispatch.mock.calls[0][0].selection).toEqual({ anchor: 14, head: 20 });
    expect(focus).toHaveBeenCalled();
  });
});
