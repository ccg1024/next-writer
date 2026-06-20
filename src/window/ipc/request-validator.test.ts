/// <reference types="jest" />

import { IPC_CHANNEL } from './ipc-contract';
import { validateIpcRequest } from './request-validator';

describe('validateIpcRequest', () => {
  it('accepts valid requests for every IPC channel', () => {
    expect(validateIpcRequest({ type: IPC_CHANNEL.READ_CONFIG })).toMatchObject({ valid: true });
    expect(validateIpcRequest({ type: IPC_CHANNEL.RUNTIME })).toMatchObject({ valid: true });
    expect(validateIpcRequest({ type: IPC_CHANNEL.READ_FILE, data: { path: './note' } })).toMatchObject({
      valid: true
    });
    expect(
      validateIpcRequest({
        type: IPC_CHANNEL.WRITE_FILE,
        data: { path: './note', content: 'content', nameInRuntime: 'renamed', revision: 1 }
      })
    ).toMatchObject({ valid: true });
    expect(
      validateIpcRequest({
        type: IPC_CHANNEL.UPDATE_CACHE,
        data: { path: './note', content: 'draft', isChange: true, revision: 2 }
      })
    ).toMatchObject({ valid: true });
    expect(
      validateIpcRequest({
        type: IPC_CHANNEL.UPDATE_LIB,
        data: { operate: 'add', path: './folder', type: 'folder', pathInRuntime: './renamed' }
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
    expect(validateIpcRequest({ type: IPC_CHANNEL.READ_FILE, data: { path: '' } })).toEqual({
      valid: false,
      message: 'Read file request requires a non-empty path.'
    });
  });

  it('rejects invalid write-file payloads', () => {
    expect(validateIpcRequest({ type: IPC_CHANNEL.WRITE_FILE, data: { path: './note' } })).toEqual({
      valid: false,
      message: 'Write file request requires a non-empty path and string content.'
    });

    expect(
      validateIpcRequest({ type: IPC_CHANNEL.WRITE_FILE, data: { path: './note', content: '', revision: Infinity } })
    ).toEqual({
      valid: false,
      message: 'Write file request revision must be a finite number.'
    });
  });

  it('rejects invalid update-cache payloads', () => {
    expect(validateIpcRequest({ type: IPC_CHANNEL.UPDATE_CACHE, data: { path: './note', content: 'draft' } })).toEqual({
      valid: false,
      message: 'Update cache request requires path, content, and isChange.'
    });
  });

  it('rejects invalid update-lib payloads', () => {
    expect(
      validateIpcRequest({ type: IPC_CHANNEL.UPDATE_LIB, data: { operate: 'move', path: './note', type: 'file' } })
    ).toEqual({
      valid: false,
      message: 'Update library request operate must be add, del, or update.'
    });

    expect(
      validateIpcRequest({ type: IPC_CHANNEL.UPDATE_LIB, data: { operate: 'add', path: './note', type: 'note' } })
    ).toEqual({
      valid: false,
      message: 'Update library request type must be file or folder.'
    });
  });

  it('accepts the deprecated misspelled write-file constant value', () => {
    expect(
      validateIpcRequest({ type: IPC_CHANNEL.WIRTE_FILE, data: { path: './note', content: 'content' } })
    ).toMatchObject({ valid: true });
  });
});
