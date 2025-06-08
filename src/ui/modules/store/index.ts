import { EditorView } from '@codemirror/view';

class Store {
  private editor: EditorView;
  constructor() {
    this.editor = null;
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
