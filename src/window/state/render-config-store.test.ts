/// <reference types="jest" />

import 'reflect-metadata';
import RenderConfigStore from './render-config-store';

describe('RenderConfigStore', () => {
  it('stores renderer config behind a defensive copy', () => {
    const store = new RenderConfigStore();
    const config = { theme: 'dark' };

    store.setConfig(config);
    config.theme = 'light';

    expect(store.getConfig()).toEqual({ theme: 'dark' });
  });
});
