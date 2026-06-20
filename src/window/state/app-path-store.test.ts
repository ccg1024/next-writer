/// <reference types="jest" />

import 'reflect-metadata';
import AppPathStore from './app-path-store';

describe('AppPathStore', () => {
  it('stores application paths independently', () => {
    const store = new AppPathStore();

    store.setPaths({
      rootDir: '/workspace',
      configDir: '/config',
      logDir: '/logs'
    });

    expect(store.getRootDir()).toBe('/workspace');
    expect(store.getConfigDir()).toBe('/config');
    expect(store.getLogDir()).toBe('/logs');
  });

  it('updates the root path without clearing other paths', () => {
    const store = new AppPathStore();

    store.setPaths({ rootDir: '/workspace', configDir: '/config', logDir: '/logs' });
    store.setRootDir('/custom-workspace');

    expect(store.getRootDir()).toBe('/custom-workspace');
    expect(store.getConfigDir()).toBe('/config');
    expect(store.getLogDir()).toBe('/logs');
  });
});
