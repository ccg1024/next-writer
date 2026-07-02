/// <reference types="jest" />

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { nextWriterSyntaxExtension } from 'src/ui/plugins/extension';
import { getImageList, imageDecoration, normalizeImageFloat, normalizeImageWidth } from './index';

function createMarkdownState(doc: string) {
  return EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage, extensions: [...nextWriterSyntaxExtension.syntax] })]
  });
}

function collectNodeNames(state: EditorState) {
  const names: string[] = [];
  syntaxTree(state).iterate({
    enter(node) {
      names.push(node.name);
    }
  });

  return names;
}

function getImageWidget(param: Parameters<typeof imageDecoration>[0]) {
  return imageDecoration(param).spec.widget as {
    estimatedHeight: number;
    toDOM: (view: EditorView) => HTMLElement;
  };
}

function createMeasureView() {
  return {
    requestMeasure: jest.fn(request => {
      if (!request) {
        return;
      }

      const measure = request.read({} as EditorView);
      request.write?.(measure, {} as EditorView);
    })
  } as unknown as EditorView;
}

describe('image field plugin', () => {
  it('normalizes supported image width values', () => {
    expect(normalizeImageWidth('240')).toBe('240px');
    expect(normalizeImageWidth('240px')).toBe('240px');
    expect(normalizeImageWidth('40%')).toBe('40%');
    expect(normalizeImageWidth('140%')).toBe('100%');
    expect(normalizeImageWidth('0')).toBeUndefined();
    expect(normalizeImageWidth('invalid')).toBeUndefined();
  });

  it('normalizes supported image float values', () => {
    expect(normalizeImageFloat('left')).toBe('left');
    expect(normalizeImageFloat('right')).toBe('right');
    expect(normalizeImageFloat('none')).toBe('none');
    expect(normalizeImageFloat('LEFT')).toBe('left');
    expect(normalizeImageFloat('center')).toBe('none');
    expect(normalizeImageFloat(undefined)).toBe('none');
  });

  it('adds image attribute nodes to the markdown syntax tree', () => {
    const state = createMarkdownState('![img](/tmp/image.png){width=240 float=left}\ntext');

    expect(collectNodeNames(state)).toEqual(
      expect.arrayContaining([
        'Image',
        'ImageAttributes',
        'ImageAttributeMark',
        'ImageAttributeName',
        'ImageAttributeValue'
      ])
    );
  });

  it('does not parse link attribute suffixes as image attribute nodes', () => {
    const state = createMarkdownState('[link](/tmp/image.png){width=240 float=left}\ntext');

    expect(collectNodeNames(state)).not.toContain('ImageAttributes');
  });

  it('reads image urls from markdown URL nodes without including title text', () => {
    const state = createMarkdownState('![img](/tmp/image.png "preview")\ntext');

    expect(getImageList(state, 0, state.doc.length, true)).toEqual([
      { from: 0, to: 32, widgetTo: 32, url: '/tmp/image.png', float: 'none' }
    ]);
  });

  it('reads width and float from image attribute nodes', () => {
    const state = createMarkdownState('![img](/tmp/image.png){width=240 float=left}\ntext');

    expect(getImageList(state, 0, state.doc.length, true)).toEqual([
      { from: 0, to: 22, widgetTo: 44, url: '/tmp/image.png', width: '240px', float: 'left' }
    ]);
  });

  it('reads image attributes after escaped alt-text delimiters', () => {
    const state = createMarkdownState('![a \\] b](img.png){width=240}\ntext');

    expect(getImageList(state, 0, state.doc.length, true)[0]).toMatchObject({
      url: 'img.png',
      width: '240px',
      float: 'none'
    });
  });

  it('reads image attributes after escaped url delimiters', () => {
    const state = createMarkdownState('![a](img\\)x){width=240}\ntext');

    expect(getImageList(state, 0, state.doc.length, true)[0]).toMatchObject({
      url: 'img\\)x',
      width: '240px',
      float: 'none'
    });
  });

  it('uses inline widgets for floated images and block widgets for regular images', () => {
    expect(imageDecoration({ url: '/tmp/image.png', float: 'left', width: '240px' }).spec.block).toBe(false);
    expect(imageDecoration({ url: '/tmp/image.png', float: 'right', width: '240px' }).spec.block).toBe(false);
    expect(imageDecoration({ url: '/tmp/image.png', float: 'none' }).spec.block).toBe(true);
  });

  it('provides an estimated height before the image is drawn', () => {
    const widget = getImageWidget({ url: '/tmp/unknown-size.png', float: 'none' });

    expect(widget.estimatedHeight).toBeGreaterThan(0);
    expect(widget.estimatedHeight).not.toBe(-1);
  });

  it('uses measured image widget height for future estimates', () => {
    const widget = getImageWidget({ url: '/tmp/measured-size.png', float: 'none' });
    const view = createMeasureView();
    const dom = widget.toDOM(view);
    jest.spyOn(dom, 'getBoundingClientRect').mockReturnValue({ height: 366 } as DOMRect);

    (dom.querySelector('img')?.onload as (event: Event) => void)(new Event('load'));

    const nextWidget = getImageWidget({ url: '/tmp/measured-size.png', float: 'none' });
    expect(nextWidget.estimatedHeight).toBe(366);
  });

  it('estimates pixel-width images from their natural size', () => {
    const widget = getImageWidget({ url: '/tmp/natural-size.png', width: '240px', float: 'none' });
    const dom = widget.toDOM(createMeasureView());
    const imgWidget = dom.querySelector('img') as HTMLImageElement;
    Object.defineProperty(imgWidget, 'naturalWidth', { configurable: true, value: 120 });
    Object.defineProperty(imgWidget, 'naturalHeight', { configurable: true, value: 80 });

    (imgWidget.onload as (event: Event) => void)(new Event('load'));

    const nextWidget = getImageWidget({ url: '/tmp/natural-size.png', width: '240px', float: 'none' });
    expect(nextWidget.estimatedHeight).toBe(164);
  });

  it('finds updated image attributes when scanning a changed line', () => {
    const oldState = createMarkdownState('![img](/tmp/image.png){width=240 float=left}\ntext');
    const newState = createMarkdownState('![img](/tmp/image.png){width=320 float=right}\ntext');
    const changedFrom = newState.doc.toString().indexOf('320');
    const oldLine = oldState.doc.lineAt(changedFrom);
    const newLine = newState.doc.lineAt(changedFrom);

    expect(getImageList(oldState, oldLine.from, oldLine.to)).toEqual([
      { from: 0, to: 22, widgetTo: 44, url: '/tmp/image.png', width: '240px', float: 'left' }
    ]);
    expect(getImageList(newState, newLine.from, newLine.to)).toEqual([
      { from: 0, to: 22, widgetTo: 45, url: '/tmp/image.png', width: '320px', float: 'right' }
    ]);
  });
});
