/// <reference types="jest" />

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App } from 'antd';
import { CommandProvider, useRegisterCommand } from 'src/ui/domain/command';
import { CommandPalette } from './command-palette';

describe('CommandPalette', () => {
  beforeAll(() => {
    const getComputedStyle = window.getComputedStyle;
    Object.defineProperty(window, 'getComputedStyle', {
      configurable: true,
      value: (element: Element) => getComputedStyle(element)
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn(() => ({ matches: false, addListener: jest.fn(), removeListener: jest.fn() }))
    });
  });

  it('opens with the shortcut, focuses search, navigates, executes and closes', async () => {
    const first = jest.fn();
    const second = jest.fn();
    render(
      <App>
        <CommandProvider>
          <Commands first={first} second={second} />
          <CommandPalette />
        </CommandProvider>
      </App>
    );

    fireEvent.keyDown(window, { key: 'P', metaKey: true, shiftKey: true });
    const input = await screen.findByLabelText('搜索命令、文档或主题');
    await waitFor(() => expect(input).toHaveFocus());
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(second).toHaveBeenCalledTimes(1));
    expect(first).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('dialog', { hidden: true })).not.toBeVisible());
  });

  it('closes with Escape without executing', async () => {
    const first = jest.fn();
    render(
      <App>
        <CommandProvider>
          <Commands first={first} second={jest.fn()} />
          <CommandPalette />
        </CommandProvider>
      </App>
    );
    fireEvent.keyDown(window, { key: 'p', ctrlKey: true, shiftKey: true });
    const input = await screen.findByLabelText('搜索命令、文档或主题');
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => expect(screen.getByRole('dialog', { hidden: true })).not.toBeVisible());
    expect(first).not.toHaveBeenCalled();
  });
});

function Commands({ first, second }: { first: () => void; second: () => void }): JSX.Element {
  useRegisterCommand({ id: 'first', title: '第一项', category: 'action', execute: first });
  useRegisterCommand({ id: 'second', title: '第二项', category: 'action', execute: second });
  return null;
}
