import { syntaxTree } from '@codemirror/language';
import { Range, RangeSet } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, PluginValue, ViewPlugin, ViewUpdate } from '@codemirror/view';
import PluginGlobal from '../../global';
import { measureText } from '../../global/utils';

const theme = EditorView.baseTheme({});

function matchBulletListFormatChar(text: string) {
  text = text ?? '';
  const identifier = { dash: 0, star: 0, plus: 0, space: 0 };
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '-') {
      identifier.dash += 1;
    } else if (text[i] === '*') {
      identifier.star += 1;
    } else if (text[i] === '+') {
      identifier.plus += 1;
    } else if (text[i] === ' ') {
      identifier.space += 1;
    } else {
      break;
    }
  }

  return identifier;
}

class List implements PluginValue {
  public decorations: DecorationSet;
  private charInfo: { starWidth: number; dashWidth: number; plusWidth: number; spaceWidth: number };
  private processDecoration(view: EditorView) {
    const decoInProcess: Range<Decoration>[] = [];
    for (const { from, to } of view.visibleRanges) {
      syntaxTree(view.state).iterate({
        from,
        to,
        enter: node => {
          // For '-', '*', '+'
          if (node.name === 'BulletList') {
            const line = view.state.doc.lineAt(node.from);
            const indentLevel = matchBulletListFormatChar(line.text);
            const width =
              indentLevel.star * this.charInfo.starWidth +
              indentLevel.dash * this.charInfo.dashWidth +
              indentLevel.plus * this.charInfo.plusWidth +
              indentLevel.space * this.charInfo.spaceWidth;
            const indentStyle = width ? `text-indent: -${width}px; padding-inline-start: ${width}px` : '';
            decoInProcess.push({
              from: line.from,
              to: line.from,
              value: Decoration.line({ attributes: { style: indentStyle } })
            });
          }
        }
      });
    }
    return RangeSet.of(decoInProcess, true);
  }
  constructor(view: EditorView) {
    const font = PluginGlobal.get('font') ?? '';
    this.charInfo = {
      starWidth: measureText('*', font).width,
      plusWidth: measureText('+', font).width,
      dashWidth: measureText('-', font).width,
      spaceWidth: measureText(' ', font).width
    };
    this.decorations = this.processDecoration(view);
  }

  update(update: ViewUpdate): void {
    const syntaxTreeChanged = syntaxTree(update.startState) !== syntaxTree(update.state);
    if (update.docChanged || update.viewportChanged || syntaxTreeChanged) {
      this.decorations = this.processDecoration(update.view);
    }
  }

  destroy(): void {
    this.decorations = null;
  }
}

const plugin = ViewPlugin.fromClass(List, { decorations: v => v.decorations });

const listExtension = { theme, plugin };

export default listExtension;
