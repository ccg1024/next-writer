import type { BrowserWindow } from 'electron';
import type { RendererListenerAction } from '_types';

interface IMenuActionService {
  save(win: BrowserWindow): void;
  toggleToc(win: BrowserWindow): void;
  toggleVisible(type: RendererListenerAction['type'], win: BrowserWindow): void;
  synchronizeLibrary(win: BrowserWindow): Promise<void>;
}

export default IMenuActionService;
