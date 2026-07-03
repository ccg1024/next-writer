import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { EditorState, Extension, Range, StateField } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
  WidgetType
} from '@codemirror/view';
import type { SyntaxNodeRef } from '@lezer/common';
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
    height: 'auto',
    display: 'block',
    cursor: 'pointer',
    borderRadius: '2px'
  }
});

export interface ImageWidgetParams {
  url: string;
}

type ImageHeightCache = {
  measuredHeight?: number;
};

const IMAGE_WIDGET_VERTICAL_PADDING = 4;
const DEFAULT_IMAGE_WIDGET_ESTIMATED_HEIGHT = 240 + IMAGE_WIDGET_VERTICAL_PADDING;
const imageHeightCache = new Map<string, ImageHeightCache>();
const IMAGE_WIDGET_DECORATION_KIND = 'image-widget';
const IMAGE_SYNTAX_HIDDEN_DECORATION_KIND = 'image-syntax-hidden';

function getImageHeightCacheKey({ url }: ImageWidgetParams) {
  return url;
}

function updateCachedImageHeight(cacheKey: string, height: number) {
  if (!Number.isFinite(height) || height <= 0) {
    return;
  }

  imageHeightCache.set(cacheKey, {
    ...imageHeightCache.get(cacheKey),
    measuredHeight: Math.ceil(height)
  });
}

function estimateImageHeight(cache: ImageHeightCache | undefined) {
  if (cache?.measuredHeight) {
    return cache.measuredHeight;
  }

  return DEFAULT_IMAGE_WIDGET_ESTIMATED_HEIGHT;
}

class ImageWidget extends WidgetType {
  readonly url: string;
  private readonly cacheKey: string;
  private readonly preloadImage: HTMLImageElement;
  private scheduleMeasure?: () => void;

  constructor({ url }: ImageWidgetParams) {
    super();

    this.url = url;
    this.cacheKey = getImageHeightCacheKey({ url });
    this.preloadImage = new Image();
    this.preloadImage.onload = () => {
      this.scheduleMeasure?.();
    };
    this.preloadImage.onerror = () => {
      this.scheduleMeasure?.();
    };
    this.preloadImage.src = `atom://${this.url}`;
  }

  eq(imageWidget: ImageWidget) {
    return imageWidget.url === this.url;
  }

  toDOM(view: EditorView) {
    const container = document.createElement('div');
    const imgWidget = new Image();
    const requestImageMeasure = () => {
      view.requestMeasure({
        key: this.cacheKey,
        read: () => container.getBoundingClientRect().height,
        write: height => updateCachedImageHeight(this.cacheKey, height)
      });
    };

    this.scheduleMeasure = requestImageMeasure;
    imgWidget.src = `atom://${this.url}`;
    imgWidget.className = 'cm-image-widget';
    imgWidget.onload = () => requestImageMeasure();
    imgWidget.onerror = () => requestImageMeasure();
    imgWidget.onclick = () => {
      nwImage.preview(imgWidget.src);
    };

    container.appendChild(imgWidget);
    container.setAttribute('data-id', 'next-writer-image-container');
    container.className = 'cm-image-container';
    if (imgWidget.complete) {
      requestImageMeasure();
    }
    return container;
  }

  destroy(): void {
    this.scheduleMeasure = undefined;
  }

  get estimatedHeight(): number {
    return estimateImageHeight(imageHeightCache.get(this.cacheKey));
  }
}

export const imageDecoration = (param: ImageWidgetParams) =>
  Decoration.widget({
    widget: new ImageWidget(param),
    side: -1,
    block: true,
    imageDecorationKind: IMAGE_WIDGET_DECORATION_KIND
  });

export const imageSyntaxHiddenDecoration = () =>
  Decoration.replace({
    inclusive: false,
    imageDecorationKind: IMAGE_SYNTAX_HIDDEN_DECORATION_KIND
  });

type RangeImg = {
  from: number;
  to: number;
  syntaxTo: number;
  widgetFrom: number;
  url: string;
};

function getImageUrl(state: EditorState, imageNode: SyntaxNodeRef): string | undefined {
  const urlNode = imageNode.node.getChild('URL');
  return urlNode ? state.doc.sliceString(urlNode.from, urlNode.to) : undefined;
}

function getLineRange(state: EditorState, from: number, to: number) {
  const docLength = state.doc.length;
  const rangeFrom = Math.max(0, Math.min(from, docLength));
  const rangeTo = Math.max(rangeFrom, Math.min(to, docLength));
  const startLine = state.doc.lineAt(rangeFrom);
  const endLine = state.doc.lineAt(rangeTo);

  return { from: startLine.from, to: endLine.to };
}

function uniqueImageList(images: RangeImg[]) {
  const imageMap = new Map<string, RangeImg>();
  images.forEach(image => {
    imageMap.set(`${image.from}:${image.to}`, image);
  });

  return Array.from(imageMap.values());
}

const getImageList = (state: EditorState, from: number, to: number, ensureTotal?: boolean) => {
  const rangeImgList: RangeImg[] = [];
  const tree = ensureTotal ? ensureSyntaxTree(state, to, 500) : syntaxTree(state);
  tree?.iterate({
    from,
    to,
    enter(node) {
      if (node.name === 'Image') {
        const url = getImageUrl(state, node);
        if (url) {
          rangeImgList.push({
            from: node.from,
            to: node.to,
            syntaxTo: node.to,
            widgetFrom: node.from,
            url
          });
        }
      }
    }
  });

  return rangeImgList;
};

export { getImageList };

function getImageDecorationRanges(img: RangeImg) {
  return [imageDecoration({ url: img.url }).range(img.widgetFrom)];
}

function isImageDecorationKind(value: Decoration, kind: string) {
  return value.spec.imageDecorationKind === kind;
}

function selectionIntersectsImageSyntax(state: EditorState, img: RangeImg) {
  return state.selection.ranges.some(range => {
    if (range.empty) {
      return range.from >= img.from && range.from <= img.syntaxTo;
    }

    return range.from < img.syntaxTo && range.to > img.from;
  });
}

function getImageSyntaxVisibilityDecorations(view: EditorView) {
  const ranges: Range<Decoration>[] = [];

  for (const { from, to } of view.visibleRanges) {
    getImageList(view.state, from, to).forEach(img => {
      if (img.syntaxTo > view.state.doc.lineAt(img.from).to) {
        return;
      }

      if (!view.hasFocus || !selectionIntersectsImageSyntax(view.state, img)) {
        ranges.push(imageSyntaxHiddenDecoration().range(img.from, img.syntaxTo));
      }
    });
  }

  return Decoration.none.update({ add: ranges, sort: true });
}

export class ImageSyntaxVisibilityPlugin implements PluginValue {
  public decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = getImageSyntaxVisibilityDecorations(view);
  }

  update(update: ViewUpdate): void {
    const syntaxTreeChanged = syntaxTree(update.startState) !== syntaxTree(update.state);
    if (
      update.docChanged ||
      update.viewportChanged ||
      update.selectionSet ||
      update.focusChanged ||
      syntaxTreeChanged
    ) {
      this.decorations = getImageSyntaxVisibilityDecorations(update.view);
    }
  }

  destroy(): void {
    this.decorations = Decoration.none;
  }
}

export const imageSyntaxVisibilityPlugin = ViewPlugin.fromClass(ImageSyntaxVisibilityPlugin, {
  decorations: value => value.decorations
});

export const imageField = StateField.define<DecorationSet>({
  create(state) {
    const imgList = getImageList(state, 0, state.doc.length, true);
    if (imgList.length) {
      const initInProcess: Range<Decoration>[] = [];
      imgList.forEach(img => {
        initInProcess.push(...getImageDecorationRanges(img));
      });
      return Decoration.none.update({ add: initInProcess, sort: true });
    }
    return Decoration.none;
  },
  update(imageField, tr) {
    if (tr.docChanged) {
      const preImg: RangeImg[] = [];
      const curImg: RangeImg[] = [];
      tr.changes.desc.iterChangedRanges((fromA, toA, fromB, toB) => {
        const preLineRange = getLineRange(tr.startState, fromA, toA);
        const curLineRange = getLineRange(tr.state, fromB, toB);
        preImg.push(...getImageList(tr.startState, preLineRange.from, preLineRange.to));
        curImg.push(...getImageList(tr.state, curLineRange.from, curLineRange.to));
      });
      const preImageList = uniqueImageList(preImg);
      const curImageList = uniqueImageList(curImg);
      if (preImageList.length) {
        imageField = imageField.update({
          filter(from, _to, value) {
            return !preImageList.find(
              p => isImageDecorationKind(value, IMAGE_WIDGET_DECORATION_KIND) && p.widgetFrom === from
            );
          }
        });
      }
      imageField = imageField.map(tr.changes);
      if (curImageList.length) {
        const imgInProcess: Range<Decoration>[] = [];
        curImageList.forEach(p => {
          imgInProcess.push(...getImageDecorationRanges(p));
        });
        imageField = imageField.update({ add: imgInProcess, sort: true });
      }
    } else {
      imageField = imageField.map(tr.changes);
    }
    return imageField;
  },
  provide: f => EditorView.decorations.from(f)
});

const imageExtension: Extension[] = [theme, imageField, imageSyntaxVisibilityPlugin];

export default imageExtension;
