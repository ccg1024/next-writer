import { app, net, protocol } from 'electron';
import nodePath from 'path';
import { pathToFileURL } from 'url';
import { inject, injectable } from 'inversify';
import IAppPathStore from '../interface/app-path-store';
import IPathResolver from '../interface/path-resolver';
import IProtocolService from '../interface/protocol-service';
import { TYPES } from '../types';

const IMAGE_EXTENSIONS = new Set(['.apng', '.avif', '.bmp', '.gif', '.ico', '.jpeg', '.jpg', '.png', '.svg', '.webp']);

@injectable()
class ProtocolService implements IProtocolService {
  private handled = false;

  constructor(
    @inject(TYPES.IPathResolver) private pathResolver: IPathResolver,
    @inject(TYPES.IAppPathStore) private appPathStore: IAppPathStore
  ) {}

  registerSchemes(): void {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: 'atom',
        privileges: {
          stream: true,
          supportFetchAPI: true,
          corsEnabled: true,
          secure: true
        }
      },
      {
        scheme: 'static',
        privileges: {
          stream: true,
          supportFetchAPI: true,
          secure: true
        }
      }
    ]);
  }

  handleProtocols(): void {
    if (this.handled) {
      return;
    }

    protocol.handle('atom', request => {
      const filePath = decodeURI(request.url.slice('atom://'.length));
      const rootDir = this.appPathStore.getRootDir();
      const targetPath = nodePath.isAbsolute(filePath) ? filePath : nodePath.resolve(rootDir, filePath);
      const safePath = this.resolveAtomPath(rootDir, targetPath);
      return net.fetch(pathToFileURL(safePath).toString());
    });

    protocol.handle('static', request => {
      const fileUrl = decodeURI(request.url.slice('static://'.length));
      const staticRoot = nodePath.join(app.getAppPath(), '.webpack/renderer');
      const safePath = this.pathResolver.resolveWithinRoot(staticRoot, nodePath.resolve(staticRoot, fileUrl));
      return net.fetch(pathToFileURL(safePath).toString());
    });

    this.handled = true;
  }

  private resolveAtomPath(rootDir: string, targetPath: string): string {
    try {
      return this.pathResolver.resolveWithinRoot(rootDir, targetPath);
    } catch (error) {
      if (this.isImagePath(targetPath)) {
        return nodePath.resolve(targetPath);
      }
      throw error;
    }
  }

  private isImagePath(targetPath: string): boolean {
    return IMAGE_EXTENSIONS.has(nodePath.extname(targetPath).toLowerCase());
  }
}

export default ProtocolService;
