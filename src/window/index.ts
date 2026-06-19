import { app } from 'electron';
import IApplication from './interface/application';
import IProtocolService from './interface/protocol-service';
import { nextWriterC } from './inversify.config';
import { TYPES } from './types';

if (require('electron-squirrel-startup')) {
  app.quit();
} else {
  const protocolService = nextWriterC.get<IProtocolService>(TYPES.IProtocolService);
  protocolService.registerSchemes();

  const application = nextWriterC.get<IApplication>(TYPES.IApplication);
  application.start();
}
