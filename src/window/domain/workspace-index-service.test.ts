/// <reference types="jest" />

import 'reflect-metadata';
import nodeFs from 'fs';
import nodeOs from 'os';
import nodePath from 'path';
import { ROOT_LIBRARY_ID, WORKSPACE_INDEX_NAME, WORKSPACE_INDEX_VERSION } from 'src/config/env';
import type { LibraryTree, RootLibraryTree } from '_types';
import FileSystem from '../infrastructure/file-system';
import AppPathStore from '../state/app-path-store';
import LibraryTreeStore from '../state/library-tree-store';
import WorkspaceIndexService from './workspace-index-service';

describe('WorkspaceIndexService', () => {
  let rootDir: string;
  let configDir: string;
  let appPathStore: AppPathStore;
  let libraryTreeStore: LibraryTreeStore;
  let service: WorkspaceIndexService;

  beforeEach(async () => {
    rootDir = await nodeFs.promises.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'next-writer-search-'));
    configDir = nodePath.join(rootDir, '.config');
    await nodeFs.promises.mkdir(configDir);
    appPathStore = new AppPathStore();
    appPathStore.setPaths({ rootDir, configDir, logDir: nodePath.join(rootDir, '.logs') });
    libraryTreeStore = new LibraryTreeStore();
    service = new WorkspaceIndexService(new FileSystem(), appPathStore, libraryTreeStore);
  });

  afterEach(async () => {
    service.destroy();
    await nodeFs.promises.rm(rootDir, { recursive: true, force: true });
  });

  it('searches filename, Markdown title, and body with location context', async () => {
    await setWorkspace([
      { id: 'filename-id', name: 'ProjectPlan', content: 'plain body' },
      { id: 'title-id', name: 'meeting', content: 'intro\n## Release Notes\nbody' },
      { id: 'body-id', name: 'journal', content: 'first line\nThe SearchNeedle is here.\nlast line' }
    ]);

    await service.initialize();

    const filename = await service.search({ query: 'projectplan' });
    const title = await service.search({ query: 'Release Notes', caseSensitive: true });
    const body = await service.search({ query: 'searchneedle' });

    expect(filename.results[0]).toMatchObject({ id: 'filename-id', field: 'filename', line: 1 });
    expect(title.results[0]).toMatchObject({ id: 'title-id', field: 'title', line: 2, column: 4 });
    expect(body.results[0]).toMatchObject({ id: 'body-id', field: 'content', line: 2, column: 5 });
    expect(body.results[0].context.slice(body.results[0].matchStart, body.results[0].matchEnd)).toBe('SearchNeedle');
  });

  it('supports case-sensitive, fuzzy, and paginated searches', async () => {
    await setWorkspace([
      { id: 'one', name: 'one', content: 'Alpha Beta Gamma' },
      { id: 'two', name: 'two', content: 'alpha beta gamma' },
      { id: 'three', name: 'three', content: 'alphabet soup' }
    ]);
    await service.initialize();

    const caseSensitive = await service.search({ query: 'Alpha', caseSensitive: true });
    const fuzzy = await service.search({ query: 'abtgm', fuzzy: true, limit: 1 });

    expect(caseSensitive.results.map(result => result.id)).toEqual(['one']);
    expect(fuzzy).toMatchObject({ total: 2, hasMore: true });
    const nextPage = await service.search({ query: 'abtgm', fuzzy: true, offset: 1, limit: 1 });
    expect(nextPage.results).toHaveLength(1);
    expect(nextPage.hasMore).toBe(false);
  });

  it('updates modified files and removes deleted files from the index', async () => {
    await setWorkspace([{ id: 'note-id', name: 'note', content: 'before-value' }]);
    await service.initialize();
    const notePath = nodePath.join(rootDir, 'drafts', 'note.md');

    await nodeFs.promises.writeFile(notePath, 'after-value');
    await service.updatePath(notePath);
    expect((await service.search({ query: 'after-value' })).results[0].id).toBe('note-id');
    expect((await service.search({ query: 'before-value' })).total).toBe(0);

    await nodeFs.promises.rm(notePath);
    await service.updatePath(notePath);
    expect((await service.search({ query: 'after-value' })).total).toBe(0);
  });

  it('persists a versioned index and rebuilds a stale version', async () => {
    await setWorkspace([{ id: 'note-id', name: 'note', content: 'persisted-value' }]);
    await service.initialize();
    const indexPath = nodePath.join(configDir, WORKSPACE_INDEX_NAME);
    const persisted = JSON.parse(await nodeFs.promises.readFile(indexPath, { encoding: 'utf8' }));
    expect(persisted.version).toBe(WORKSPACE_INDEX_VERSION);

    persisted.version = WORKSPACE_INDEX_VERSION - 1;
    persisted.entries[0].content = 'stale-value';
    await nodeFs.promises.writeFile(indexPath, JSON.stringify(persisted));
    service.destroy();
    service = new WorkspaceIndexService(new FileSystem(), appPathStore, libraryTreeStore);
    await service.initialize();

    expect((await service.search({ query: 'persisted-value' })).total).toBe(1);
    expect((await service.search({ query: 'stale-value' })).total).toBe(0);
  });

  it('indexes and searches a 1,000-file performance sample without returning an unbounded result set', async () => {
    const notes = Array.from({ length: 1000 }, (_, index) => ({
      id: `note-${index}`,
      name: `note-${index}`,
      content: `# Note ${index}\nshared performance marker ${index}`
    }));
    await setWorkspace(notes);
    const startedAt = Date.now();

    await service.initialize();
    const response = await service.search({ query: 'performance marker', limit: 50 });

    expect(response).toMatchObject({ total: 1000, hasMore: true });
    expect(response.results).toHaveLength(50);
    expect(Date.now() - startedAt).toBeLessThan(10000);
  }, 15000);

  async function setWorkspace(notes: Array<{ id: string; name: string; content: string }>): Promise<void> {
    const libraryPath = nodePath.join(rootDir, 'drafts');
    await nodeFs.promises.mkdir(libraryPath, { recursive: true });
    const children: LibraryTree[] = [];
    for (const note of notes) {
      await nodeFs.promises.writeFile(nodePath.join(libraryPath, `${note.name}.md`), note.content);
      children.push({
        id: note.id,
        name: note.name,
        type: 'file',
        birthTime: '',
        modifiedTime: '',
        children: []
      });
    }
    const tree: RootLibraryTree = {
      id: ROOT_LIBRARY_ID,
      children: [
        {
          id: 'drafts-id',
          name: 'drafts',
          type: 'folder',
          birthTime: '',
          modifiedTime: '',
          children
        }
      ]
    };
    libraryTreeStore.setTree(tree);
  }
});
