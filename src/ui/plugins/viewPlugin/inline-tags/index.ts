import { syntaxTree } from '@codemirror/language';
import { Range, RangeSet } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, PluginValue, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { filterableReplaceDeco, replaceDecorationFilter } from '../../global/utils';

const theme = EditorView.baseTheme({});

class InlineTags implements PluginValue {
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
          // TODO: Need change curosr position, when decorantion filter.
          if (node.name === 'StrongEmphasis') {
            decosInProcess.push(filterableReplaceDeco(node.from, node.from + 2, { from: node.from, to: node.to }));
            decosInProcess.push(filterableReplaceDeco(node.to - 2, node.to, { from: node.from, to: node.to }));
          } else if (node.name === 'Emphasis') {
            decosInProcess.push(filterableReplaceDeco(node.from, node.from + 1, { from: node.from, to: node.to }));
            decosInProcess.push(filterableReplaceDeco(node.to - 1, node.to, { from: node.from, to: node.to }));
          }
        }
      });
    }
    return decosInProcess;
  }

  update(update: ViewUpdate): void {
    const syntaxTreeChanged = syntaxTree(update.startState) !== syntaxTree(update.state);
    if (update.docChanged || update.viewportChanged || syntaxTreeChanged) {
      this.stageDecos = this.processDecoration(update.view);
    }
    this.decorations = replaceDecorationFilter(this.stageDecos, update.view);
  }
  destroy(): void {
    this.stageDecos = null;
    this.decorations = null;
  }
}

const plugin = ViewPlugin.fromClass(InlineTags, { decorations: v => v.decorations });

const inlineTagExtension = { theme, plugin };

export default inlineTagExtension;
