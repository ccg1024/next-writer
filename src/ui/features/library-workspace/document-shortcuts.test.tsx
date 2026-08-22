/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import type { RendererLibraryTree, RendererRootLibraryTree, WorkspaceMetadata } from '_types';
import rendererGateway from 'src/ui/shared/ipc/renderer-gateway';
import { DocumentShortcuts } from './document-shortcuts';

const mockSetCurrentLib = jest.fn();
const mockSetCurrentNote = jest.fn();
const mockLibraryState: { libraryTree: RendererRootLibraryTree } = { libraryTree: null };

jest.mock('src/ui/domain/library', () => ({
  useLibraryState: () => mockLibraryState,
  useLibraryActions: () => ({ setCurrentLib: mockSetCurrentLib, setCurrentNote: mockSetCurrentNote })
}));

jest.mock('src/ui/shared/ipc/renderer-gateway', () => ({
  __esModule: true,
  default: { getWorkspaceMetadata: jest.fn(), updateWorkspaceMetadata: jest.fn() }
}));

describe('DocumentShortcuts', () => {
  let folder: RendererLibraryTree;
  let note: RendererLibraryTree;
  let metadata: WorkspaceMetadata;

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
      name: 'first',
      type: 'file',
      birthTime: '',
      modifiedTime: '',
      children: [],
      parent: folder
    };
    folder.children = [note];
    root.children = [folder];
    mockLibraryState.libraryTree = root;
    metadata = {
      version: 1,
      recent: [{ id: 'note-id', path: 'drafts/first.md', openedAt: 10 }],
      favoriteIds: [],
      pinnedIds: [],
      recentLimit: 20,
      invalidPathsCleanedAt: 0
    };
    (rendererGateway.getWorkspaceMetadata as jest.Mock).mockResolvedValue({ status: 0, data: metadata });
  });

  it('opens a recent document through the library state actions', async () => {
    const onClose = jest.fn();
    render(
      <App>
        <DocumentShortcuts open onClose={onClose} />
      </App>
    );

    fireEvent.click(await screen.findByText('first'));

    expect(mockSetCurrentLib).toHaveBeenCalledWith(folder);
    expect(mockSetCurrentNote).toHaveBeenCalledWith(note);
    expect(onClose).toHaveBeenCalled();
  });

  it('updates favorites and clears recent records through typed metadata actions', async () => {
    (rendererGateway.updateWorkspaceMetadata as jest.Mock)
      .mockResolvedValueOnce({ status: 0, data: { ...metadata, favoriteIds: ['note-id'] } })
      .mockResolvedValueOnce({ status: 0, data: { ...metadata, recent: [] } });
    render(
      <App>
        <DocumentShortcuts open onClose={jest.fn()} />
      </App>
    );

    fireEvent.click(await screen.findByLabelText('收藏'));
    await waitFor(() =>
      expect(rendererGateway.updateWorkspaceMetadata).toHaveBeenCalledWith({
        action: 'set-favorite',
        id: 'note-id',
        value: true
      })
    );
    fireEvent.click(await screen.findByText('清除记录'));
    await waitFor(() =>
      expect(rendererGateway.updateWorkspaceMetadata).toHaveBeenLastCalledWith({ action: 'clear-recent' })
    );
  });
});
