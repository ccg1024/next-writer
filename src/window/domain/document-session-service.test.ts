import 'reflect-metadata';
import DocumentSessionService, { transitionDocumentSession } from './document-session-service';

describe('DocumentSessionService', () => {
  const path = '/workspace/note.md';
  let service: DocumentSessionService;

  beforeEach(() => {
    service = new DocumentSessionService();
  });

  it('loads a clean session with a disk snapshot', () => {
    expect(service.load('note', path, 'saved', 10)).toEqual({
      id: 'note',
      path,
      content: 'saved',
      savedContent: 'saved',
      status: 'ready',
      localRevision: 0,
      savedRevision: 0,
      diskModifiedTime: 10
    });
  });

  it('increments revisions and marks changed content dirty', () => {
    service.load('note', path, 'saved');

    expect(service.updateContent('note', 'draft')).toMatchObject({
      content: 'draft',
      status: 'dirty',
      localRevision: 1
    });
  });

  it('does not create a revision when content is unchanged', () => {
    const session = service.load('note', path, 'saved');

    expect(service.updateContent('note', 'saved')).toBe(session);
    expect(service.get('note')).toMatchObject({ status: 'ready', localRevision: 0, savedRevision: 0 });
  });

  it('becomes clean when an edit is reverted to the disk snapshot', () => {
    service.load('note', path, 'saved');
    service.updateContent('note', 'draft');

    expect(service.updateContent('note', 'saved')).toMatchObject({
      content: 'saved',
      savedContent: 'saved',
      status: 'saved',
      localRevision: 2,
      savedRevision: 0
    });
  });

  it('does not let an older save replace a newer edit', () => {
    service.load('note', path, 'saved');
    service.updateContent('note', 'draft', 1);
    service.beginSave('note', 1);
    service.updateContent('note', 'newer draft', 2);

    expect(service.completeSave('note', 'draft', 1)).toMatchObject({
      content: 'newer draft',
      savedContent: 'draft',
      status: 'dirty',
      localRevision: 2,
      savedRevision: 1
    });
  });

  it('does not create a content revision when saving begins', () => {
    service.load('note', path, 'saved');

    expect(service.beginSave('note')).toMatchObject({ status: 'saving', localRevision: 0, savedRevision: 0 });
  });

  it('keeps a newer edit and records an older save failure', () => {
    service.load('note', path, 'saved');
    service.updateContent('note', 'draft');
    service.beginSave('note', 1);
    service.updateContent('note', 'newer draft');

    expect(service.failSave('note', 'disk unavailable', 1)).toMatchObject({
      content: 'newer draft',
      savedContent: 'saved',
      status: 'save-error',
      localRevision: 2,
      savedRevision: 0,
      lastError: 'disk unavailable'
    });
  });

  it('updates the path without changing content state or revision', () => {
    service.load('note', path, 'saved');
    service.updateContent('note', 'draft');

    expect(service.updatePath('note', '/workspace/renamed.md')).toMatchObject({
      path: '/workspace/renamed.md',
      content: 'draft',
      status: 'dirty',
      localRevision: 1
    });
  });

  it('keeps dirty content and exposes save errors', () => {
    service.load('note', path, 'saved');
    service.updateContent('note', 'draft');
    service.beginSave('note', 1);

    expect(service.failSave('note', 'disk unavailable', 1)).toMatchObject({
      content: 'draft',
      savedContent: 'saved',
      status: 'save-error',
      lastError: 'disk unavailable'
    });
  });

  it('rejects invalid state transitions', () => {
    const session = service.load('note', path, 'saved');

    expect(() => transitionDocumentSession(session, 'saved')).toThrow(
      'Invalid document session transition: ready -> saved'
    );
  });
});
