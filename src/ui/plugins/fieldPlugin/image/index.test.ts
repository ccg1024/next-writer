/// <reference types="jest" />

import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { syntaxTree } from '@codemirror/language';
import { EditorSelection, EditorState, Extension, SelectionRange } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { nextWriterSyntaxExtension } from 'src/ui/plugins/extension';
import {
  getImageList,
  imageDecoration,
  imageField,
  ImageSyntaxVisibilityPlugin,
  imageSyntaxVisibilityPlugin,
  normalizeImageFloat,
  normalizeImageWidth
} from './index';

function createMarkdownState(doc: string, extensions: Extension[] = []) {
  return EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage, extensions: [...nextWriterSyntaxExtension.syntax] }), ...extensions]
  });
}

function createMarkdownView(doc: string, selection: SelectionRange = EditorSelection.cursor(0)) {
  const parent = document.createElement('div');
  document.body.appendChild(parent);

  const view = new EditorView({
    state: EditorState.create({
      doc,
      selection: EditorSelection.create([selection]),
      extensions: [
        markdown({ base: markdownLanguage, extensions: [...nextWriterSyntaxExtension.syntax] }),
        imageField,
        imageSyntaxVisibilityPlugin
      ]
    }),
    parent
  });
  view.focus();
  Object.defineProperty(view, 'hasFocus', { configurable: true, get: () => true });
  view.dispatch({ selection: view.state.selection });

  return view;
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

function collectImageFieldDecorations(state: EditorState) {
  const decorations: {
    from: number;
    to: number;
    kind: string;
    side: number | undefined;
    block: boolean | undefined;
    lineBreaks: number | undefined;
  }[] = [];

  state.field(imageField).between(0, state.doc.length, (from, to, value) => {
    decorations.push({
      from,
      to,
      kind: value.spec.imageDecorationKind,
      side: value.spec.side,
      block: value.spec.block,
      lineBreaks: value.spec.widget?.lineBreaks
    });
  });

  return decorations;
}

function collectImageSyntaxHiddenDecorations(view: EditorView) {
  const plugin = view.plugin(imageSyntaxVisibilityPlugin) as ImageSyntaxVisibilityPlugin;
  const decorations: { from: number; to: number; kind: string; inclusive: boolean | undefined }[] = [];

  plugin.decorations.between(0, view.state.doc.length, (from, to, value) => {
    decorations.push({
      from,
      to,
      kind: value.spec.imageDecorationKind,
      inclusive: value.spec.inclusive
    });
  });

  return decorations;
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
    const imageSyntax = '![img](/tmp/image.png "preview")';
    const state = createMarkdownState(`${imageSyntax}\ntext`);

    expect(getImageList(state, 0, state.doc.length, true)).toEqual([
      {
        from: 0,
        to: imageSyntax.length,
        syntaxTo: imageSyntax.length,
        widgetFrom: 0,
        url: '/tmp/image.png',
        float: 'none'
      }
    ]);
  });

  it('reads width and float from image attribute nodes', () => {
    const imageSyntax = '![img](/tmp/image.png)';
    const imageAttributes = '{width=240 float=left}';
    const state = createMarkdownState(`${imageSyntax}${imageAttributes}\ntext`);

    expect(getImageList(state, 0, state.doc.length, true)).toEqual([
      {
        from: 0,
        to: imageSyntax.length,
        syntaxTo: imageSyntax.length + imageAttributes.length,
        widgetFrom: 0,
        url: '/tmp/image.png',
        width: '240px',
        float: 'left'
      }
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

  it('anchors image widgets before the markdown image syntax', () => {
    const state = createMarkdownState('![img](/tmp/image.png){width=240 float=left}\ntext');

    expect(getImageList(state, 0, state.doc.length, true)[0]).toMatchObject({ widgetFrom: 0 });
    expect(imageDecoration({ url: '/tmp/image.png', float: 'none' }).spec.side).toBe(-1);
  });

  it('does not add a visual line break decoration when text follows image syntax on the same line', () => {
    const imageSyntax = '![img](/tmp/image.png)';
    const imageAttributes = '{width=100}';
    const imageSyntaxTo = imageSyntax.length + imageAttributes.length;
    const state = createMarkdownState(`${imageSyntax}${imageAttributes}other text`, [imageField]);

    expect(getImageList(state, 0, state.doc.length, true)).toEqual([
      {
        from: 0,
        to: imageSyntax.length,
        syntaxTo: imageSyntaxTo,
        widgetFrom: 0,
        url: '/tmp/image.png',
        width: '100px',
        float: 'none'
      }
    ]);
    expect(collectImageFieldDecorations(state)).toEqual([
      {
        from: 0,
        to: 0,
        kind: 'image-widget',
        side: -1,
        block: true,
        lineBreaks: 0
      }
    ]);
  });

  it('does not add a visual line break when image syntax is already followed by a document line break', () => {
    const imageSyntax = '![img](/tmp/image.png)';
    const state = createMarkdownState(`${imageSyntax}\ntext`, [imageField]);

    expect(getImageList(state, 0, state.doc.length, true)[0]).toMatchObject({
      syntaxTo: imageSyntax.length
    });
    expect(collectImageFieldDecorations(state)).toEqual([
      {
        from: 0,
        to: 0,
        kind: 'image-widget',
        side: -1,
        block: true,
        lineBreaks: 0
      }
    ]);
  });

  it('does not add a visual line break when image syntax is at the end of the document', () => {
    const imageSyntax = '![img](/tmp/image.png)';
    const state = createMarkdownState(imageSyntax, [imageField]);

    expect(getImageList(state, 0, state.doc.length, true)[0]).toMatchObject({
      syntaxTo: imageSyntax.length
    });
    expect(collectImageFieldDecorations(state)).toHaveLength(1);
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
    const oldImageSyntax = '![img](/tmp/image.png){width=240 float=left}';
    const newImageSyntax = '![img](/tmp/image.png){width=320 float=right}';
    const baseImageSyntax = '![img](/tmp/image.png)';
    const oldState = createMarkdownState(`${oldImageSyntax}\ntext`);
    const newState = createMarkdownState(`${newImageSyntax}\ntext`);
    const changedFrom = newState.doc.toString().indexOf('320');
    const oldLine = oldState.doc.lineAt(changedFrom);
    const newLine = newState.doc.lineAt(changedFrom);

    expect(getImageList(oldState, oldLine.from, oldLine.to)).toEqual([
      {
        from: 0,
        to: baseImageSyntax.length,
        syntaxTo: oldImageSyntax.length,
        widgetFrom: 0,
        url: '/tmp/image.png',
        width: '240px',
        float: 'left'
      }
    ]);
    expect(getImageList(newState, newLine.from, newLine.to)).toEqual([
      {
        from: 0,
        to: baseImageSyntax.length,
        syntaxTo: newImageSyntax.length,
        widgetFrom: 0,
        url: '/tmp/image.png',
        width: '320px',
        float: 'right'
      }
    ]);
  });

  it('keeps adjacent image widgets when one image updates', () => {
    const firstImage = '![a](a.png)';
    const secondImage = '![b](b.png)';
    const state = createMarkdownState(`${firstImage}${secondImage}tail`, [imageField]);
    const transaction = state.update({
      changes: {
        from: firstImage.length + secondImage.indexOf('b.png'),
        to: firstImage.length + secondImage.indexOf('b.png') + 'b.png'.length,
        insert: 'updated.png'
      }
    });

    expect(collectImageFieldDecorations(transaction.state)).toEqual([
      {
        from: 0,
        to: 0,
        kind: 'image-widget',
        side: -1,
        block: true,
        lineBreaks: 0
      },
      {
        from: firstImage.length,
        to: firstImage.length,
        kind: 'image-widget',
        side: -1,
        block: true,
        lineBreaks: 0
      }
    ]);
  });

  it('hides the entire image syntax when the cursor is outside the syntax range', () => {
    const imageSyntax = '![img](/tmp/image.png "preview")';
    const imageAttributes = '{width=240 float=left}';
    const doc = `${imageSyntax}${imageAttributes} text`;
    const view = createMarkdownView(doc, EditorSelection.cursor(doc.length));

    expect(collectImageSyntaxHiddenDecorations(view)).toEqual([
      {
        from: 0,
        to: imageSyntax.length + imageAttributes.length,
        kind: 'image-syntax-hidden',
        inclusive: false
      }
    ]);

    view.destroy();
    view.dom.remove();
  });

  it.each([
    ['left boundary', 0],
    ['image marker', 1],
    ['alt text', 3],
    ['url', '![img]('.length + 5],
    ['title', '![img](/tmp/image.png "'.length + 2],
    ['attributes', '![img](/tmp/image.png "preview")'.length + 3],
    ['right boundary', '![img](/tmp/image.png "preview"){width=240 float=left}'.length]
  ])('shows image syntax when the cursor is inside the %s', (_name, cursor) => {
    const doc = '![img](/tmp/image.png "preview"){width=240 float=left} text';
    const view = createMarkdownView(doc, EditorSelection.cursor(cursor as number));

    expect(collectImageSyntaxHiddenDecorations(view)).toEqual([]);

    view.destroy();
    view.dom.remove();
  });

  it('uses selection intersections to decide whether image syntax is visible', () => {
    const imageSyntax = '![img](/tmp/image.png)';
    const doc = `prefix ${imageSyntax} suffix`;
    const imageFrom = doc.indexOf(imageSyntax);
    const view = createMarkdownView(doc, EditorSelection.range(imageFrom - 2, imageFrom + 2));

    expect(collectImageSyntaxHiddenDecorations(view)).toEqual([]);

    view.dispatch({ selection: EditorSelection.range(0, imageFrom) });
    expect(collectImageSyntaxHiddenDecorations(view)).toEqual([
      {
        from: imageFrom,
        to: imageFrom + imageSyntax.length,
        kind: 'image-syntax-hidden',
        inclusive: false
      }
    ]);

    view.destroy();
    view.dom.remove();
  });

  it('hides image syntax when the editor loses focus', () => {
    const imageSyntax = '![img](/tmp/image.png)';
    const view = createMarkdownView(imageSyntax, EditorSelection.cursor(2));

    expect(collectImageSyntaxHiddenDecorations(view)).toEqual([]);

    Object.defineProperty(view, 'hasFocus', { configurable: true, get: () => false });
    view.dispatch({ selection: view.state.selection });

    expect(collectImageSyntaxHiddenDecorations(view)).toEqual([
      {
        from: 0,
        to: imageSyntax.length,
        kind: 'image-syntax-hidden',
        inclusive: false
      }
    ]);

    view.destroy();
    view.dom.remove();
  });

  it('hides adjacent image syntax independently', () => {
    const firstImage = '![a](a.png)';
    const secondImage = '![b](b.png)';
    const doc = `${firstImage}${secondImage}tail`;
    const view = createMarkdownView(doc, EditorSelection.cursor(firstImage.length + 2));

    expect(collectImageSyntaxHiddenDecorations(view)).toEqual([
      {
        from: 0,
        to: firstImage.length,
        kind: 'image-syntax-hidden',
        inclusive: false
      }
    ]);

    view.destroy();
    view.dom.remove();
  });

  it('hides only the image syntax when text follows on the same line', () => {
    const imageSyntax = '![img](/tmp/image.png)';
    const imageAttributes = '{width=100}';
    const doc = `${imageSyntax}${imageAttributes}other text`;
    const view = createMarkdownView(doc, EditorSelection.cursor(doc.length));

    expect(collectImageSyntaxHiddenDecorations(view)).toEqual([
      {
        from: 0,
        to: imageSyntax.length + imageAttributes.length,
        kind: 'image-syntax-hidden',
        inclusive: false
      }
    ]);
    expect(collectImageFieldDecorations(view.state)).toEqual([
      {
        from: 0,
        to: 0,
        kind: 'image-widget',
        side: -1,
        block: true,
        lineBreaks: 0
      }
    ]);

    view.destroy();
    view.dom.remove();
  });

  it('updates hidden image syntax ranges after editing image attributes', () => {
    const imageSyntax = '![img](/tmp/image.png)';
    const oldAttributes = '{width=100}';
    const doc = `${imageSyntax}${oldAttributes}other text`;
    const view = createMarkdownView(doc, EditorSelection.cursor(doc.length));

    view.dispatch({
      changes: {
        from: imageSyntax.length + oldAttributes.indexOf('100'),
        to: imageSyntax.length + oldAttributes.indexOf('100') + '100'.length,
        insert: '240 float=right'
      },
      selection: { anchor: view.state.doc.length + ' float=right'.length }
    });

    expect(collectImageSyntaxHiddenDecorations(view)).toEqual([
      {
        from: 0,
        to: imageSyntax.length + '{width=240 float=right}'.length,
        kind: 'image-syntax-hidden',
        inclusive: false
      }
    ]);

    view.destroy();
    view.dom.remove();
  });
});
