import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { EditorState, Extension, Range, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { nwImage } from 'src/ui/mix-components/image';

const theme = EditorView.baseTheme({
  '.cm-image-container': {
    boxSizing: 'border-box',
    paddingBlock: '2px',
    position: 'relative',
    '&:hover::after': {
      opacity: 1
    },
    '&::after': {
      content: '""',
      position: 'absolute',
      top: '2px',
      left: 0,
      width: '100%',
      height: 'calc(100% - 4px)',
      opacity: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      borderRadius: '2px',
      transition: 'opacity 0.3s',
      pointerEvents: 'none'
    }
  },
  '.cm-image-widget': {
    width: '100%',
    display: 'block',
    cursor: 'pointer',
    borderRadius: '2px'
  }
});

interface ImageWidgetParams {
  url: string;
}

class ImageWidget extends WidgetType {
  readonly url;
  private imgWidget: HTMLImageElement;

  constructor({ url }: ImageWidgetParams) {
    super();

    this.url = url;
    this.imgWidget = new Image();
    this.imgWidget.src = `atom://${this.url}`;
    this.imgWidget.className = 'cm-image-widget';
    this.imgWidget.onclick = () => {
      nwImage.preview(this.imgWidget.src);
    };
  }

  eq(imageWidget: ImageWidget) {
    return imageWidget.url === this.url;
  }

  toDOM() {
    const container = document.createElement('div');
    container.appendChild(this.imgWidget);
    container.setAttribute('data-id', 'next-writer-image-container');
    container.className = 'cm-image-container';
    return container;
  }
  get estimatedHeight(): number {
    return -1;
  }
}

const imageDecoration = (param: ImageWidgetParams) =>
  Decoration.widget({ widget: new ImageWidget(param), side: 1, block: true });

const IMG_REGX = /!\[.*?\]\(.*?\)/;
const URL_REGX = /!\[.*?\]\((.*?)\)/;

type RangeImg = {
  from: number;
  to: number;
  img: string;
};
const getImageList = (state: EditorState, from: number, to: number, ensureTotal?: boolean) => {
  const rangeImgList: RangeImg[] = [];
  const tree = ensureTotal ? ensureSyntaxTree(state, to, 500) : syntaxTree(state);
  tree.iterate({
    from,
    to,
    enter(node) {
      if (node.name === 'Image') {
        const txt = state.doc.sliceString(node.from, node.to);
        if (IMG_REGX.test(txt)) {
          rangeImgList.push({ from: node.from, to: node.to, img: txt });
        }
      }
    }
  });

  return rangeImgList;
};

const imageField = StateField.define<DecorationSet>({
  create(state) {
    const imgList = getImageList(state, 0, state.doc.length, true);
    if (imgList.length) {
      const initInProcess: Range<Decoration>[] = [];
      imgList.forEach(img => {
        const url = URL_REGX.exec(img.img);
        if (url) {
          initInProcess.push(imageDecoration({ url: url[1] }).range(img.to));
        }
      });
      return Decoration.none.update({ add: initInProcess });
    }
    return Decoration.none;
  },
  update(imageField, tr) {
    if (tr.docChanged) {
      const preImg: RangeImg[] = [];
      const curImg: RangeImg[] = [];
      tr.changes.desc.iterChangedRanges((fromA, toA, fromB, toB) => {
        preImg.push(...getImageList(tr.startState, fromA, toA));
        curImg.push(...getImageList(tr.state, fromB, toB));
      });
      if (preImg.length) {
        imageField = imageField.update({
          filter(from) {
            return !preImg.find(p => p.to === from);
          }
        });
      }
      imageField = imageField.map(tr.changes);
      if (curImg.length) {
        const imgInProcess: Range<Decoration>[] = [];
        curImg.forEach(p => {
          const url = URL_REGX.exec(p.img);
          if (url) {
            imgInProcess.push(imageDecoration({ url: url[1] }).range(p.to));
          }
        });
        imageField = imageField.update({ add: imgInProcess });
      }
    } else {
      imageField = imageField.map(tr.changes);
    }
    return imageField;
  },
  provide: f => EditorView.decorations.from(f)
});

const imageExtension: Extension[] = [theme, imageField];

export default imageExtension;
