/// <reference types="jest" />

import 'reflect-metadata';
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import INextIpcHandler from '../interface/next-ipc-handler';
import ISenderValidator from '../interface/sender-validator';
import { IPC_CHANNEL, IPC_SERVER_NAME } from '../ipc/ipc-contract';
import NextIpcServer from './next-ipc-server';

jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    removeAllListeners: jest.fn(),
    removeHandler: jest.fn()
  }
}));

describe('NextIpcServer', () => {
  let senderValidator: jest.Mocked<ISenderValidator>;
  let server: NextIpcServer;
  let event: IpcMainInvokeEvent;

  beforeEach(() => {
    senderValidator = {
      isTrusted: jest.fn().mockReturnValue(true),
      createContext: jest.fn().mockImplementation((ipcEvent: IpcMainInvokeEvent) => ({
        event: ipcEvent,
        senderFrame: ipcEvent.senderFrame ?? null,
        window: null as BrowserWindow | null
      }))
    };
    server = new NextIpcServer(senderValidator);
    event = createEvent(1);
    jest.clearAllMocks();
  });

  it('registers the shared IPC listener once', () => {
    server.listen();

    expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC_SERVER_NAME);
    expect(ipcMain.handle).toHaveBeenCalledWith(IPC_SERVER_NAME, expect.any(Function));
  });

  it('returns failure responses for invalid and unknown requests', async () => {
    await expect(server.listener(event, null)).resolves.toEqual({
      status: -1,
      data: null,
      message: 'Invalid IPC request.'
    });
    await expect(server.listener(event, { type: 'unknown' })).resolves.toEqual({
      status: -1,
      data: null,
      message: 'Invalid IPC channel.'
    });
  });

  it('rejects duplicate handler registrations', () => {
    const handler = createHandler(IPC_CHANNEL.READ_FILE, { content: 'content' });

    server.registerHandler(handler);

    expect(() => server.registerHandler(handler)).toThrow('Duplicate IPC handler channel: read-file');
  });

  it('rejects untrusted senders without calling the handler', async () => {
    const handler = createHandler(IPC_CHANNEL.READ_FILE, { content: 'content' });
    senderValidator.isTrusted.mockReturnValue(false);
    server.registerHandler(handler);

    await expect(server.listener(event, { type: IPC_CHANNEL.READ_FILE, data: { path: './note' } })).resolves.toEqual({
      status: -1,
      data: null,
      message: 'Untrusted IPC sender.'
    });
    expect(handler.handle).not.toHaveBeenCalled();
  });

  it('dispatches trusted requests and wraps handler results', async () => {
    const handler = createHandler(IPC_CHANNEL.READ_FILE, { content: 'content' });
    server.registerHandler(handler);

    await expect(server.listener(event, { type: IPC_CHANNEL.READ_FILE, data: { path: './note' } })).resolves.toEqual({
      status: 0,
      data: { content: 'content' }
    });
    expect(handler.handle).toHaveBeenCalledWith(
      { path: './note' },
      expect.objectContaining({ event, senderFrame: null, window: null })
    );
  });

  it('normalizes undefined handler results to null response data', async () => {
    const handler = createHandler(IPC_CHANNEL.WRITE_FILE, undefined);
    server.registerHandler(handler);

    await expect(
      server.listener(event, { type: IPC_CHANNEL.WRITE_FILE, data: { path: './note', content: 'content' } })
    ).resolves.toEqual({
      status: 0,
      data: null
    });
  });

  it('wraps handler errors as failure responses', async () => {
    const handler = createHandler(IPC_CHANNEL.READ_FILE, { content: 'content' });
    (handler.handle as jest.Mock).mockRejectedValueOnce(new Error('read failed'));
    server.registerHandler(handler);

    await expect(server.listener(event, { type: IPC_CHANNEL.READ_FILE, data: { path: './note' } })).resolves.toEqual({
      status: -1,
      data: null,
      message: 'read failed'
    });
  });

  it('removes handlers and Electron listeners on destroy', () => {
    const handler = createHandler(IPC_CHANNEL.READ_FILE, { content: 'content' });
    server.registerHandler(handler);

    server.destroy();

    expect(ipcMain.removeAllListeners).toHaveBeenCalledWith(IPC_SERVER_NAME);
    expect(ipcMain.removeHandler).toHaveBeenCalledWith(IPC_SERVER_NAME);
  });

  function createHandler(channel: string, result: unknown): INextIpcHandler {
    return {
      channel,
      handle: jest.fn().mockResolvedValue(result)
    } as INextIpcHandler;
  }

  function createEvent(senderId: number): IpcMainInvokeEvent {
    return {
      sender: { id: senderId },
      senderFrame: null
    } as unknown as IpcMainInvokeEvent;
  }
});
