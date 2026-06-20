/// <reference types="jest" />

import 'reflect-metadata';
import nodeFs from 'fs';
import nodeOs from 'os';
import nodePath from 'path';
import { pathToFileURL } from 'url';
import { app, net, protocol } from 'electron';
import IAppPathStore from '../interface/app-path-store';
import PathResolver from '../infrastructure/path-resolver';
import ProtocolService from './protocol-service';

jest.mock('electron', () => ({
  app: {
    getAppPath: jest.fn()
  },
  net: {
    fetch: jest.fn()
  },
  protocol: {
    handle: jest.fn(),
    registerSchemesAsPrivileged: jest.fn()
  }
}));

type CapturedProtocolHandler = (request: { url: string }) => unknown;

describe('ProtocolService', () => {
  let rootDir: string;
  let appPath: string;
  let service: ProtocolService;

  beforeEach(async () => {
    rootDir = await nodeFs.promises.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'next-writer-protocol-root-'));
    appPath = await nodeFs.promises.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'next-writer-protocol-app-'));
    const appPathStore = createAppPathStore();

    (app.getAppPath as jest.Mock).mockReturnValue(appPath);
    (net.fetch as jest.Mock).mockImplementation(async (url: string) => ({ url }));
    (protocol.handle as jest.Mock).mockClear();
    (protocol.registerSchemesAsPrivileged as jest.Mock).mockClear();

    service = new ProtocolService(new PathResolver(appPathStore), appPathStore);
  });

  afterEach(async () => {
    await nodeFs.promises.rm(rootDir, { recursive: true, force: true });
    await nodeFs.promises.rm(appPath, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it('registers atom and static protocol handlers once', () => {
    service.handleProtocols();
    service.handleProtocols();

    expect(protocol.handle).toHaveBeenCalledTimes(2);
    expect(protocol.handle).toHaveBeenNthCalledWith(1, 'atom', expect.any(Function));
    expect(protocol.handle).toHaveBeenNthCalledWith(2, 'static', expect.any(Function));
  });

  it('allows atom files inside the library root', async () => {
    service.handleProtocols();
    const atomHandler = getProtocolHandler('atom');
    const relativeTarget = nodePath.join(rootDir, 'images', 'cover.png');
    const absoluteTarget = nodePath.join(rootDir, 'images', 'absolute.png');

    await atomHandler({ url: 'atom://images/cover.png' });
    expect(net.fetch).toHaveBeenLastCalledWith(pathToFileURL(relativeTarget).toString());

    await atomHandler({ url: `atom://${absoluteTarget}` });
    expect(net.fetch).toHaveBeenLastCalledWith(pathToFileURL(absoluteTarget).toString());
  });

  it('allows external image paths for atom compatibility', async () => {
    service.handleProtocols();
    const atomHandler = getProtocolHandler('atom');
    const externalImage = nodePath.join(nodeOs.tmpdir(), 'external-cover.webp');

    await atomHandler({ url: `atom://${externalImage}` });

    expect(net.fetch).toHaveBeenLastCalledWith(pathToFileURL(externalImage).toString());
  });

  it('rejects external non-image atom paths', () => {
    service.handleProtocols();
    const atomHandler = getProtocolHandler('atom');
    const externalDocument = nodePath.join(nodeOs.tmpdir(), 'external-note.md');

    expect(() => atomHandler({ url: `atom://${externalDocument}` })).toThrow(
      'The path is outside of the allowed root.'
    );
    expect(net.fetch).not.toHaveBeenCalled();
  });

  it('allows static assets inside the renderer bundle root', async () => {
    service.handleProtocols();
    const staticHandler = getProtocolHandler('static');
    const staticRoot = nodePath.join(appPath, '.webpack/renderer');
    const targetPath = nodePath.join(staticRoot, 'assets', 'app.js');

    await staticHandler({ url: 'static://assets/app.js' });

    expect(net.fetch).toHaveBeenLastCalledWith(pathToFileURL(targetPath).toString());
  });

  it('rejects static traversal outside the renderer bundle root', () => {
    service.handleProtocols();
    const staticHandler = getProtocolHandler('static');

    expect(() => staticHandler({ url: 'static://../secret.js' })).toThrow('The path is outside of the allowed root.');
    expect(net.fetch).not.toHaveBeenCalled();
  });

  function createAppPathStore(): IAppPathStore {
    return {
      setPaths(paths: { rootDir?: string }) {
        rootDir = paths.rootDir ?? rootDir;
      },
      setRootDir(nextRootDir: string) {
        rootDir = nextRootDir;
      },
      getRootDir() {
        return rootDir;
      },
      getConfigDir() {
        return '';
      },
      getLogDir() {
        return '';
      }
    };
  }

  function getProtocolHandler(scheme: string): CapturedProtocolHandler {
    const registration = (protocol.handle as jest.Mock).mock.calls.find(
      ([registeredScheme]) => registeredScheme === scheme
    );

    if (!registration) {
      throw new Error(`No protocol handler registered for ${scheme}`);
    }

    return registration[1] as CapturedProtocolHandler;
  }
});
