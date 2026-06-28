import { syntaxTree } from '@codemirror/language';
import { Range, RangeSet } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, PluginValue, ViewPlugin, ViewUpdate } from '@codemirror/view';
import PluginGlobal from '../../global';
import { filterableReplaceDeco, replaceDecorationFilter } from '../../global/utils';

const theme = EditorView.baseTheme({
  '.cm-content > .cm-code-block': {
    backgroundColor: 'var(--nw-hover-bg)',
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
      backgroundColor: 'var(--nw-hover-bg)'
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
      backgroundColor: 'var(--nw-hover-bg)'
    }
  }
});

class CodeBlockPlugin implements PluginValue {
  public decorations: DecorationSet;
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
              filterableReplaceDeco(startLineOfBlock.from, startLineOfBlock.to, { from: node.from, to: node.to })
            );
            decosInProcess.push(
              filterableReplaceDeco(endLineOfBlock.from, endLineOfBlock.to, { from: node.from, to: node.to })
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
    } else if (PluginGlobal.get('didMousePress')) {
      // If mouse is kept pressed, it means that content selection is in progress and the last decorator content is kept,
      // oterwise, this function will re-run when mouseup event triggered, and will updating decorations in other scenarios.
      return;
    }
    this.decorations = replaceDecorationFilter(this.stageDecos, update.view);
  }

  destroy() {
    this.stageDecos = null;
    this.decorations = null;
  }
}

const plugin = ViewPlugin.fromClass(CodeBlockPlugin, { decorations: v => v.decorations });

const codeblockExtension = { theme, plugin };

export default codeblockExtension;
