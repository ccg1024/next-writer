/// <reference types="jest" />

import { IPC_CHANNEL } from './ipc-contract';
import { validateIpcRequest } from './request-validator';

describe('validateIpcRequest', () => {
  it('accepts valid requests for every IPC channel', () => {
    expect(validateIpcRequest({ type: IPC_CHANNEL.READ_CONFIG })).toMatchObject({ valid: true });
    expect(validateIpcRequest({ type: IPC_CHANNEL.RUNTIME })).toMatchObject({ valid: true });
    expect(validateIpcRequest({ type: IPC_CHANNEL.READ_FILE, data: { id: 'note-id' } })).toMatchObject({
      valid: true
    });
    expect(
      validateIpcRequest({
        type: IPC_CHANNEL.WRITE_FILE,
        data: { id: 'note-id', content: 'content', revision: 1 }
      })
    ).toMatchObject({ valid: true });
    expect(
      validateIpcRequest({
        type: IPC_CHANNEL.UPDATE_CACHE,
        data: { id: 'note-id', content: 'draft', isChange: true, revision: 2 }
      })
    ).toMatchObject({ valid: true });
    expect(
      validateIpcRequest({
        type: IPC_CHANNEL.UPDATE_LIB,
        data: { operate: 'add', parentId: '__root__', type: 'folder', name: 'folder' }
      })
    ).toMatchObject({ valid: true });
    expect(
      validateIpcRequest({
        type: IPC_CHANNEL.UPDATE_LIB,
        data: { operate: 'rename', id: 'folder-id', name: 'renamed' }
      })
    ).toMatchObject({ valid: true });
    expect(
      validateIpcRequest({
        type: IPC_CHANNEL.UPDATE_LIB,
        data: { operate: 'del', id: 'folder-id' }
      })
    ).toMatchObject({ valid: true });
  });

  it('rejects invalid request envelopes and unknown channels', () => {
    expect(validateIpcRequest(null)).toEqual({ valid: false, message: 'Invalid IPC request.' });
    expect(validateIpcRequest({})).toEqual({ valid: false, message: 'Invalid IPC channel.' });
    expect(validateIpcRequest({ type: 'unknown' })).toEqual({ valid: false, message: 'Invalid IPC channel.' });
  });

  it('rejects payloads on no-data channels', () => {
    expect(validateIpcRequest({ type: IPC_CHANNEL.READ_CONFIG, data: {} })).toEqual({
      valid: false,
      message: 'IPC channel does not accept request data.'
    });
  });

  it('rejects invalid read-file payloads', () => {
    expect(validateIpcRequest({ type: IPC_CHANNEL.READ_FILE, data: { id: '' } })).toEqual({
      valid: false,
      message: 'Read file request requires a non-empty id.'
    });
  });

  it('rejects invalid write-file payloads', () => {
    expect(validateIpcRequest({ type: IPC_CHANNEL.WRITE_FILE, data: { id: 'note-id' } })).toEqual({
      valid: false,
      message: 'Write file request requires a non-empty id and string content.'
    });

    expect(
      validateIpcRequest({ type: IPC_CHANNEL.WRITE_FILE, data: { id: 'note-id', content: '', revision: Infinity } })
    ).toEqual({
      valid: false,
      message: 'Write file request revision must be a finite number.'
    });
  });

  it('rejects invalid update-cache payloads', () => {
    expect(validateIpcRequest({ type: IPC_CHANNEL.UPDATE_CACHE, data: { id: 'note-id', content: 'draft' } })).toEqual({
      valid: false,
      message: 'Update cache request requires id, content, and isChange.'
    });
  });

  it('rejects invalid update-lib payloads', () => {
    expect(validateIpcRequest({ type: IPC_CHANNEL.UPDATE_LIB, data: { operate: 'move', id: 'note-id' } })).toEqual({
      valid: false,
      message: 'Update library request operate must be add, del, or rename.'
    });

    expect(
      validateIpcRequest({
        type: IPC_CHANNEL.UPDATE_LIB,
        data: { operate: 'add', parentId: '__root__', name: 'note', type: 'note' }
      })
    ).toEqual({
      valid: false,
      message: 'Add library request type must be file or folder.'
    });

    expect(validateIpcRequest({ type: IPC_CHANNEL.UPDATE_LIB, data: { operate: 'rename', id: 'note-id' } })).toEqual({
      valid: false,
      message: 'Rename library request requires id and name.'
    });
  });

  it('accepts the deprecated misspelled write-file constant value', () => {
    expect(
      validateIpcRequest({ type: IPC_CHANNEL.WIRTE_FILE, data: { id: 'note-id', content: 'content' } })
    ).toMatchObject({ valid: true });
  });
});
