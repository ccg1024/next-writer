import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { EditorState, Extension, Range, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import type { SyntaxNode, SyntaxNodeRef } from '@lezer/common';
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
  '.cm-image-container.cm-image-float-left': {
    float: 'left',
    marginInlineEnd: '12px'
  },
  '.cm-image-container.cm-image-float-right': {
    float: 'right',
    marginInlineStart: '12px'
  },
  '.cm-image-widget': {
    width: '100%',
    height: 'auto',
    display: 'block',
    cursor: 'pointer',
    borderRadius: '2px'
  }
});

export const IMAGE_FLOAT_VALUES = ['left', 'right', 'none'] as const;

export type ImageFloat = (typeof IMAGE_FLOAT_VALUES)[number];

export interface ImageWidgetParams {
  url: string;
  width?: string;
  float: ImageFloat;
}

type ImageHeightCache = {
  measuredHeight?: number;
  naturalWidth?: number;
  naturalHeight?: number;
};

const IMAGE_WIDGET_VERTICAL_PADDING = 4;
const DEFAULT_IMAGE_WIDGET_ESTIMATED_HEIGHT = 240 + IMAGE_WIDGET_VERTICAL_PADDING;
const imageHeightCache = new Map<string, ImageHeightCache>();

function getImageHeightCacheKey({ url, width, float }: ImageWidgetParams) {
  return [url, width ?? '', float].join('\u0000');
}

function getImageWidthPx(width: string | undefined): number | undefined {
  const match = width?.match(/^(\d+(?:\.\d+)?)px$/);
  return match ? Number(match[1]) : undefined;
}

function updateCachedImageSize(cacheKey: string, imgWidget: HTMLImageElement) {
  if (!imgWidget.naturalWidth || !imgWidget.naturalHeight) {
    return;
  }

  imageHeightCache.set(cacheKey, {
    ...imageHeightCache.get(cacheKey),
    naturalWidth: imgWidget.naturalWidth,
    naturalHeight: imgWidget.naturalHeight
  });
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

function estimateImageHeight(width: string | undefined, cache: ImageHeightCache | undefined) {
  if (cache?.measuredHeight) {
    return cache.measuredHeight;
  }

  const widthPx = getImageWidthPx(width);
  if (widthPx && cache?.naturalWidth && cache.naturalHeight) {
    return Math.ceil((cache.naturalHeight * widthPx) / cache.naturalWidth + IMAGE_WIDGET_VERTICAL_PADDING);
  }

  return DEFAULT_IMAGE_WIDGET_ESTIMATED_HEIGHT;
}

class ImageWidget extends WidgetType {
  readonly url: string;
  readonly width?: string;
  readonly float: ImageFloat;
  private readonly cacheKey: string;
  private readonly preloadImage: HTMLImageElement;
  private scheduleMeasure?: () => void;

  constructor({ url, width, float }: ImageWidgetParams) {
    super();

    this.url = url;
    this.width = width;
    this.float = float;
    this.cacheKey = getImageHeightCacheKey({ url, width, float });
    this.preloadImage = new Image();
    this.preloadImage.onload = () => {
      updateCachedImageSize(this.cacheKey, this.preloadImage);
      this.scheduleMeasure?.();
    };
    this.preloadImage.onerror = () => {
      this.scheduleMeasure?.();
    };
    this.preloadImage.src = `atom://${this.url}`;
  }

  eq(imageWidget: ImageWidget) {
    return imageWidget.url === this.url && imageWidget.width === this.width && imageWidget.float === this.float;
  }

  toDOM(view: EditorView) {
    const container = document.createElement(this.float === 'none' ? 'div' : 'span');
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
    imgWidget.onload = () => {
      updateCachedImageSize(this.cacheKey, imgWidget);
      requestImageMeasure();
    };
    imgWidget.onerror = () => requestImageMeasure();
    imgWidget.onclick = () => {
      nwImage.preview(imgWidget.src);
    };

    container.appendChild(imgWidget);
    container.setAttribute('data-id', 'next-writer-image-container');
    container.className = ['cm-image-container', this.float !== 'none' ? `cm-image-float-${this.float}` : '']
      .filter(Boolean)
      .join(' ');
    if (this.width) {
      container.style.width = this.width;
    }
    if (imgWidget.complete) {
      updateCachedImageSize(this.cacheKey, imgWidget);
      requestImageMeasure();
    }
    return container;
  }

  destroy(): void {
    this.scheduleMeasure = undefined;
  }

  get estimatedHeight(): number {
    return estimateImageHeight(this.width, imageHeightCache.get(this.cacheKey));
  }
}

export const imageDecoration = (param: ImageWidgetParams) =>
  Decoration.widget({ widget: new ImageWidget(param), side: -1, block: param.float === 'none' });

const WIDTH_REGX = /^(\d+(?:\.\d+)?)(px|%)?$/;

type RangeImg = {
  from: number;
  to: number;
  widgetFrom: number;
  url: string;
  width?: string;
  float: ImageFloat;
};

export function normalizeImageWidth(width: string | undefined): string | undefined {
  const match = width?.trim().match(WIDTH_REGX);
  if (!match) {
    return;
  }

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) {
    return;
  }

  const unit = match[2] ?? 'px';
  if (unit === '%') {
    return `${Math.min(value, 100)}%`;
  }

  return `${value}px`;
}

export function normalizeImageFloat(float: string | undefined): ImageFloat {
  const value = float?.trim().toLowerCase();
  return IMAGE_FLOAT_VALUES.includes(value as ImageFloat) ? (value as ImageFloat) : 'none';
}

export function trimAttributeValue(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function getImageAttributeNode(imageNode: SyntaxNodeRef): SyntaxNode | undefined {
  const attributeNode = imageNode.node.nextSibling;
  return attributeNode?.name === 'ImageAttributes' && attributeNode.from === imageNode.to ? attributeNode : undefined;
}

function readAttributeValue(state: EditorState, valueNode: SyntaxNode): string {
  return trimAttributeValue(state.doc.sliceString(valueNode.from, valueNode.to));
}

export function parseImageAttributes(state: EditorState, attributeNode: SyntaxNode | undefined) {
  const params: Pick<ImageWidgetParams, 'width' | 'float'> = { float: 'none' };
  if (!attributeNode) {
    return params;
  }

  for (let child = attributeNode.firstChild; child; child = child.nextSibling) {
    if (child.name !== 'ImageAttributeName' || child.nextSibling?.name !== 'ImageAttributeValue') {
      continue;
    }

    const key = state.doc.sliceString(child.from, child.to).toLowerCase();
    const value = readAttributeValue(state, child.nextSibling);
    if (key === 'width') {
      params.width = normalizeImageWidth(value);
    } else if (key === 'float') {
      params.float = normalizeImageFloat(value);
    }
  }

  return params;
}

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
          const attributeNode = getImageAttributeNode(node);
          const attributes = parseImageAttributes(state, attributeNode);
          rangeImgList.push({
            from: node.from,
            to: node.to,
            widgetFrom: node.from,
            url,
            ...attributes
          });
        }
      }
    }
  });

  return rangeImgList;
};

export { getImageList };

const imageField = StateField.define<DecorationSet>({
  create(state) {
    const imgList = getImageList(state, 0, state.doc.length, true);
    if (imgList.length) {
      const initInProcess: Range<Decoration>[] = [];
      imgList.forEach(img => {
        initInProcess.push(imageDecoration({ url: img.url, width: img.width, float: img.float }).range(img.widgetFrom));
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
        const preLineRange = getLineRange(tr.startState, fromA, toA);
        const curLineRange = getLineRange(tr.state, fromB, toB);
        preImg.push(...getImageList(tr.startState, preLineRange.from, preLineRange.to));
        curImg.push(...getImageList(tr.state, curLineRange.from, curLineRange.to));
      });
      const preImageList = uniqueImageList(preImg);
      const curImageList = uniqueImageList(curImg);
      if (preImageList.length) {
        imageField = imageField.update({
          filter(from) {
            return !preImageList.find(p => p.widgetFrom === from);
          }
        });
      }
      imageField = imageField.map(tr.changes);
      if (curImageList.length) {
        const imgInProcess: Range<Decoration>[] = [];
        curImageList.forEach(p => {
          imgInProcess.push(imageDecoration({ url: p.url, width: p.width, float: p.float }).range(p.widgetFrom));
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
