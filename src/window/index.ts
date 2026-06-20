import { app } from 'electron';
import IApplication from './interface/application';
import IProtocolService from './interface/protocol-service';
import { container } from './container';
import { TYPES } from './types';

if (require('electron-squirrel-startup')) {
  app.quit();
} else {
  const protocolService = container.get<IProtocolService>(TYPES.IProtocolService);
  protocolService.registerSchemes();

  const application = container.get<IApplication>(TYPES.IApplication);
  application.start();
}
