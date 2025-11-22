import { EditorView } from '@codemirror/view';

export type RuntimeRecord = {
  menuStatus: {
    librarySidebar: boolean;
    detailSidebar: boolean;
    tocSidebar: boolean;
    actionSidebar: boolean;
  };
};

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
