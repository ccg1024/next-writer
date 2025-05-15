import { syntaxTree } from '@codemirror/language';
import { Range, RangeSet } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, PluginValue, ViewPlugin, ViewUpdate } from '@codemirror/view';
import PluginGlobal from '../../global';
import { filterableLineDeco, filterableReplaceDeco, replaceDecorationFilter } from '../../global/utils';

const theme = EditorView.baseTheme({
  '.cm-horizontal-rule': {
    position: 'relative',
    '&:after': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: 0,
      width: '100%',
      borderTop: '2px solid #586EA5',
      transform: 'translateY(-50%)'
    }
  },
  '.cm-inline-code': {
    backgroundColor: 'rgba(175, 184, 193, 0.2)',
    padding: '0.15em 0.3em',
    borderRadius: '4px'
  },
  '.cm-inline-code-mark': {
    borderStartStartRadius: '4px',
    borderEndStartRadius: '4px',
    backgroundColor: 'rgba(175, 184, 193, 0.2)',
    color: 'var(--nw-theme-code-mark)',
    padding: '0.15em 0'
  },
  '.cm-inline-code-mark ~ .cm-inline-code': {
    paddingInline: 0,
    borderRadius: 0
  },
  '.cm-inline-code + .cm-inline-code-mark': {
    borderStartStartRadius: 0,
    borderEndStartRadius: 0,
    borderStartEndRadius: '4px',
    borderEndEndRadius: '4px'
  }
});

const SYNTAX_HEADS = ['ATXHeading1', 'ATXHeading2', 'ATXHeading3', 'ATXHeading4', 'ATXHeading5', 'ATXHeading6'];

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
          if (node.name === 'BoldItalic') {
            decosInProcess.push(filterableReplaceDeco(node.from, node.from + 3, { from: node.from, to: node.to }));
            decosInProcess.push(filterableReplaceDeco(node.to - 3, node.to, { from: node.from, to: node.to }));
          } else if (node.name === 'StrongEmphasis') {
            // double mark: **bold**
            decosInProcess.push(filterableReplaceDeco(node.from, node.from + 2, { from: node.from, to: node.to }));
            decosInProcess.push(filterableReplaceDeco(node.to - 2, node.to, { from: node.from, to: node.to }));
          } else if (node.name === 'Emphasis') {
            // signle mark: *italic*
            decosInProcess.push(filterableReplaceDeco(node.from, node.from + 1, { from: node.from, to: node.to }));
            decosInProcess.push(filterableReplaceDeco(node.to - 1, node.to, { from: node.from, to: node.to }));
          } else if (node.name === 'InlineCode') {
            // inline-code content
            decosInProcess.push({
              from: node.from + 1,
              to: node.to - 1,
              value: Decoration.mark({ class: 'cm-inline-code' })
            });
            decosInProcess.push({
              from: node.from,
              to: node.from + 1,
              value: Decoration.mark({ class: 'cm-inline-code-mark' })
            });
            decosInProcess.push({
              from: node.to - 1,
              to: node.to,
              value: Decoration.mark({ class: 'cm-inline-code-mark' })
            });
            decosInProcess.push(filterableReplaceDeco(node.from, node.from + 1, { from: node.from, to: node.to }));
            decosInProcess.push(filterableReplaceDeco(node.to - 1, node.to, { from: node.from, to: node.to }));
          } else if (node.name === 'HorizontalRule') {
            decosInProcess.push(filterableReplaceDeco(node.from, node.to, { from: node.from, to: node.to }));
            decosInProcess.push(
              filterableLineDeco(node.from, node.from, { class: 'cm-horizontal-rule', from: node.from, to: node.to })
            );
          } else if (SYNTAX_HEADS.includes(node.name)) {
            const headLevel = parseInt(node.name[node.name.length - 1]);
            const diff = node.to - node.from;
            if (diff > headLevel + 1) {
              decosInProcess.push(
                filterableReplaceDeco(node.from, node.from + headLevel + 1, { from: node.from, to: node.to })
              );
            }
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
    } else if (PluginGlobal.get('didMousePress')) {
      return;
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
