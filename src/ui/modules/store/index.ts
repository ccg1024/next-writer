import { EditorView } from '@codemirror/view';
import { RuntimeConfigResponse } from '_types';

export type RuntimeRecord = RuntimeConfigResponse;

class Store {
  private editor: EditorView;
  public runtime: RuntimeRecord;
  constructor() {
    this.editor = null;
    this.runtime = null;
  }

  setEditor(editor: EditorView) {
    this.editor = editor;
  }
  getEditor() {
    return this.editor;
  }
}

const renderStore = new Store();

export default renderStore;
