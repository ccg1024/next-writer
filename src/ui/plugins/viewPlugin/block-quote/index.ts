import { syntaxTree } from '@codemirror/language';
import { Range, RangeSet } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, PluginValue, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { measureText } from '../../global/utils';

const theme = EditorView.baseTheme({
  '.cm-block-quote': {
    backgroundColor: 'rgba(226,232,240,0.5)'
  }
});
class BlockQuote implements PluginValue {
  public decoration: DecorationSet;
  private fontInfo: { markWidth: number; spaceWidth: number };
  private matchQuoteMarkLevel(text: string) {
    text = text ?? '';
    if (!text.startsWith('>')) {
      return null;
    }

    const identifier = { mark: 0, space: 0 };
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '>') {
        identifier.mark += 1;
      } else if (text[i] === ' ') {
        identifier.space += 1;
      } else {
        break;
      }
    }
    return identifier;
  }
  private processDecoration(view: EditorView) {
    const decosInProcess: Range<Decoration>[] = [];
    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: node => {
          if (node.name === 'Blockquote') {
            for (let pos = node.from; pos <= node.to; ) {
              const line = view.state.doc.lineAt(pos);
              const indentLevel = this.matchQuoteMarkLevel(line.text);
              let indentStyle = '';
              if (indentLevel) {
                const width = indentLevel.mark * this.fontInfo.markWidth + indentLevel.space * this.fontInfo.spaceWidth;
                indentStyle = `text-indent: -${width}px; padding-inline-start: ${width}px`;
              }
              decosInProcess.push({
                from: line.from,
                to: line.from,
                value: Decoration.line({ class: 'cm-block-quote', attributes: { style: indentStyle } })
              });
              pos = line.to + 1;
            }
          }
        }
      });
    }
    return decosInProcess;
  }
  constructor(view: EditorView) {
    const span = document.querySelector('#nw-measure');
    const _font = window.getComputedStyle(span).font;
    this.fontInfo = {
      markWidth: measureText('>', _font).width,
      spaceWidth: measureText(' ', _font).width
    };
    this.decoration = RangeSet.of(this.processDecoration(view), true);
  }

  update(update: ViewUpdate): void {
    const syntaxTreeChanged = syntaxTree(update.startState) !== syntaxTree(update.state);
    if (update.docChanged || update.viewportChanged || syntaxTreeChanged) {
      this.decoration = RangeSet.of(this.processDecoration(update.view), true);
    }
  }

  destroy(): void {
    this.decoration = null;
  }
}

const plugin = ViewPlugin.fromClass(BlockQuote, { decorations: v => v.decoration });

const blockQuoteExtension = { theme, plugin };

export default blockQuoteExtension;
