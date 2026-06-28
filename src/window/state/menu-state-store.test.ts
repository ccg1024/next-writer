/// <reference types="jest" />

import 'reflect-metadata';
import MenuStateStore from './menu-state-store';

describe('MenuStateStore', () => {
  it('returns default menu state and resets toggled values', () => {
    const store = new MenuStateStore();

    store.toggle('toggle-lib');
    store.toggle('toggle-toc');
    store.reset();

    expect(store.getStatus()).toEqual({
      librarySidebar: true,
      detailSidebar: true,
      tocSidebar: false,
      typewriterMode: false,
      actionSidebar: false
    });
  });

  it('toggles menu state with defensive read copies', () => {
    const store = new MenuStateStore();
    const status = store.getStatus();

    status.librarySidebar = false;

    expect(store.toggle('toggle-lib')).toBe(false);
    expect(store.toggle('toggle-lib-detail')).toBe(false);
    expect(store.toggle('toggle-toc')).toBe(true);
    expect(store.toggle('toggle-typewriter-mode')).toBe(true);
    expect(store.getStatus()).toEqual({
      librarySidebar: false,
      detailSidebar: false,
      tocSidebar: true,
      typewriterMode: true,
      actionSidebar: false
    });
  });
});
