import { Range, RangeSet } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';

type LineDecorationSpec = Parameters<typeof Decoration.line>[0];

export type FilterableDecoSpec = {
  needFilter?: boolean;
  from?: number; // the lowest position to check with cursor;
  to?: number; // the highest position to check with cursor;
};
export function filterableReplaceDeco(from: number, to: number, spec: FilterableDecoSpec) {
  return { from, to, value: Decoration.replace({ needFilter: true, ...spec }) };
}

export function filterableLineDeco(from: number, to: number, spec: LineDecorationSpec & FilterableDecoSpec) {
  return { from, to, value: Decoration.line({ needFilter: true, ...spec }) };
}

// TODO: Rename, since the filter logic of decoration is same
export function replaceDecorationFilter(ranges: Range<Decoration>[], view: EditorView) {
  if (!view.hasFocus) {
    return RangeSet.of(ranges, true);
  }
  // Get main selection cursor position
  const cursorFrom = view.state.selection.main.from;
  const cursorTo = view.state.selection.main.to;
  return RangeSet.of(
    ranges.filter(deco => {
      const { value } = deco ?? {};
      const spec = value.spec as FilterableDecoSpec;
      if (spec.needFilter) {
        // When the cursor position intersects the  lowest point(from) and the highest point(to), filter the decoration
        if (
          (spec.from <= cursorFrom && spec.to >= cursorFrom) ||
          (spec.from <= cursorTo && spec.to >= cursorTo) ||
          (spec.from >= cursorFrom && spec.to <= cursorTo)
        ) {
          return false;
        }
      }
      return true;
    }),
    true
  );
}

function _measureText() {
  const canvers = document.createElement('canvas');
  const ctx = canvers.getContext('2d');
  return (text: string, font: string) => {
    ctx.font = font;
    return ctx.measureText(text);
  };
}

export const measureText = _measureText();
