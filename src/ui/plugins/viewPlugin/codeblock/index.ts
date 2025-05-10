import { syntaxTree } from '@codemirror/language';
import { Range, RangeSet } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, PluginValue, ViewPlugin, ViewUpdate } from '@codemirror/view';

const decoOfHide = (from: number, to: number, spec?: Record<string, unknown>) => {
  return { from, to, value: Decoration.replace({ needFilter: true, ...spec }) };
};

const theme = EditorView.baseTheme({
  '.cm-content > .cm-code-block': {
    backgroundColor: '#cccccc22',
    fontFamily: 'var(--nw-editor-code-font-family)',
    position: 'relative',
    marginInline: '16px',
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 0,
      height: '100%',
      width: '16px',
      zIndex: -1,
      transform: 'translateX(-100%)',
      backgroundColor: '#cccccc22'
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      right: 0,
      height: '100%',
      width: '16px',
      zIndex: -1,
      transform: 'translateX(100%)',
      backgroundColor: '#cccccc22'
    }
  }
});

class CodeBlockPlugin implements PluginValue {
  public decorations: DecorationSet;
  public didMousePress: boolean;
  public selectFromBlockInner: boolean;
  private stageDecos: Range<Decoration>[];

  constructor(view: EditorView) {
    this.stageDecos = this.processDecoration(view);
    this.decorations = RangeSet.of(this.stageDecos, true);
  }
  private processDecoration(view: EditorView) {
    const decosInProcess: Range<Decoration>[] = [];
    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: node => {
          if (node.name === 'FencedCode') {
            for (let pos = node.from; pos <= node.to; ) {
              const line = view.state.doc.lineAt(pos);
              decosInProcess.push({
                from: line.from,
                to: line.from,
                value: Decoration.line({
                  class: 'cm-code-block'
                })
              });
              pos = line.to + 1;
            }
            // hide code mark of code block
            const startLineOfBlock = view.state.doc.lineAt(node.from);
            const endLineOfBlock = view.state.doc.lineAt(node.to);
            decosInProcess.push(
              decoOfHide(startLineOfBlock.from, startLineOfBlock.to, { blockFrom: node.from, blockTo: node.to })
            );
            decosInProcess.push(
              decoOfHide(endLineOfBlock.from, endLineOfBlock.to, { blockFrom: node.from, blockTo: node.to })
            );
          }
        }
      });
    }

    return decosInProcess;
  }

  update(update: ViewUpdate) {
    const syntaxTreeChanged = syntaxTree(update.startState) !== syntaxTree(update.state);
    if (update.docChanged || update.viewportChanged || syntaxTreeChanged) {
      this.stageDecos = this.processDecoration(update.view);
    }
    const cursorFrom = update.view.state.selection.main.from;
    const cursorTo = update.view.state.selection.main.to;
    this.decorations = RangeSet.of(
      this.stageDecos.filter(deco => {
        const { value } = deco;
        if (value.spec.needFilter) {
          // If the cursor id completely inside the code block, unhide code mark
          // and make flag duraingSelection, since the cursor could
          if (
            value.spec.blockFrom <= cursorFrom &&
            value.spec.blockTo >= cursorFrom &&
            value.spec.blockFrom <= cursorTo &&
            value.spec.blockTo >= cursorTo
          ) {
            this.selectFromBlockInner = true;
            return false;
          }
          // If the selection start from code block inner, keep code mark unhide.
          if (this.selectFromBlockInner) {
            return false;
          }
          // If the code mark is not unhide, keep it during selection.
          if (this.didMousePress && !update.state.selection.main.empty) {
            return true;
          }

          // If not select or select finished, check the cursor position, unhide code mark only if cursor range contain block
          if (
            (value.spec.blockFrom <= cursorFrom && value.spec.blockTo >= cursorFrom) ||
            (value.spec.blockFrom <= cursorTo && value.spec.blockTo >= cursorTo) ||
            (value.spec.blockFrom >= cursorFrom && value.spec.blockTo <= cursorTo)
          ) {
            return false;
          }
        }
        return true;
      }),
      true
    );
  }

  destroy() {
    this.stageDecos = null;
  }
}

const plugin = ViewPlugin.fromClass(CodeBlockPlugin, {
  decorations: v => v.decorations,
  eventHandlers: {
    mousedown(_e, view) {
      const pluginInstance = view.plugin(plugin);
      pluginInstance.didMousePress = true;
    },
    // TODO: If the mouse outside the editor, this event will not be triggered
    // A better solution needs to be considered
    mouseup(_e, view) {
      const pluginInstance = view.plugin(plugin);
      pluginInstance.didMousePress = false;
      pluginInstance.selectFromBlockInner = false;
      view.dispatch({});
    }
  }
});

const codeblockExtension = { theme, plugin };

export default codeblockExtension;
