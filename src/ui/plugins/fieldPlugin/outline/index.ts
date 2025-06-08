import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { EditorState, Line, StateField } from '@codemirror/state';

export type HeadField = {
  level: number;
  line: Line;
  text: string;
};

const HEAD_LIST = ['ATXHeading1', 'ATXHeading2', 'ATXHeading3', 'ATXHeading4', 'ATXHeading5', 'ATXHeading6'];

const getHeadingList = (state: EditorState, from: number, to: number, ensureTotal?: boolean) => {
  const headList: HeadField[] = [];
  const tree = ensureTotal ? ensureSyntaxTree(state, to, 500) : syntaxTree(state);
  tree.iterate({
    from,
    to,
    enter(node) {
      if (HEAD_LIST.includes(node.name)) {
        const level = +node.name[node.name.length - 1];
        const line = state.doc.lineAt(node.from);
        const text = state.doc.sliceString(node.from, node.to);
        headList.push({ level, line, text });
      }
    }
  });

  return headList;
};

export const outlintField = StateField.define<HeadField[]>({
  create(state) {
    return getHeadingList(state, 0, state.doc.length, true);
  },
  update(headList, tr) {
    if (!tr.docChanged) {
      return headList;
    }

    const pre = new Set<number>();
    const cur: HeadField[] = [];
    tr.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
      for (let pos = fromA; pos <= toA; ) {
        const line = tr.startState.doc.lineAt(pos);
        pre.add(line.number);
        pos = line.to + 1;
      }
      cur.push(...getHeadingList(tr.state, fromB, toB));
    });

    // Remove modified head
    if (pre.size) {
      headList = headList.filter(head => !pre.has(head.line.number));
    }

    // Update head list pos
    headList = headList.map(head => {
      const newPos = tr.changes.mapPos(head.line.from);
      const line = tr.state.doc.lineAt(newPos);
      return { ...head, line };
    });

    return [...headList, ...cur].sort((a, b) => a.line.number - b.line.number);
  }
});

const outlineExtension = [outlintField];

export default outlineExtension;
