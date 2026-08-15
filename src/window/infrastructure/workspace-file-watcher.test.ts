/// <reference types="jest" />

import 'reflect-metadata';
import nodeFs from 'fs';
import nodePath from 'path';
import WorkspaceFileWatcher from './workspace-file-watcher';

describe('WorkspaceFileWatcher', () => {
  let close: jest.Mock;
  let changeListener: (eventType: 'rename' | 'change', filename: string | Buffer) => void;

  beforeEach(() => {
    jest.useFakeTimers();
    close = jest.fn();
    jest.spyOn(nodeFs, 'watch').mockImplementation(((
      _path: string,
      _options: object,
      listener: typeof changeListener
    ) => {
      changeListener = listener;
      return { close } as unknown as nodeFs.FSWatcher;
    }) as typeof nodeFs.watch);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('coalesces workspace Markdown changes and ignores other files', () => {
    const listener = jest.fn();
    const watcher = new WorkspaceFileWatcher();
    watcher.start('/workspace', listener);

    changeListener('change', 'drafts/note.md');
    changeListener('rename', 'drafts/note.md');
    changeListener('change', 'drafts/image.png');
    jest.advanceTimersByTime(50);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      kind: 'rename',
      path: nodePath.resolve('/workspace', 'drafts/note.md')
    });
  });

  it('closes the native watcher and cancels pending events when stopped', () => {
    const listener = jest.fn();
    const watcher = new WorkspaceFileWatcher();
    watcher.start('/workspace', listener);
    changeListener('change', 'note.md');

    watcher.stop();
    jest.advanceTimersByTime(50);

    expect(close).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('forwards directory rename events so opened descendants can be marked unavailable', () => {
    const listener = jest.fn();
    const watcher = new WorkspaceFileWatcher();
    watcher.start('/workspace', listener);

    changeListener('rename', 'drafts');
    jest.advanceTimersByTime(50);

    expect(listener).toHaveBeenCalledWith({
      kind: 'rename',
      path: nodePath.resolve('/workspace', 'drafts')
    });
  });
});
