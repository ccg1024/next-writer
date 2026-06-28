import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { bracketMatching, foldKeymap, HighlightStyle, indentOnInput, syntaxHighlighting } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Compartment, EditorState, Extension } from '@codemirror/state';
import {
  drawSelection,
  dropCursor,
  EditorView,
  highlightSpecialChars,
  keymap,
  PluginValue,
  rectangularSelection,
  ViewPlugin,
  ViewUpdate
} from '@codemirror/view';
import React, { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSpec } from 'style-mod';
import { tags, Tag, styleTags } from '@lezer/highlight';
import { MarkdownConfig } from '@lezer/markdown';
import ViewPlugins from '../plugins/viewPlugin';
import FieldPlugins from '../plugins/fieldPlugin';
import PluginGlobal from '../plugins/global';
import { nextWriterSyntaxExtension } from '../plugins/extension';
import renderStore from '../modules/store';

import '../css/theme.css';

export type InitialEditorState = {
  initDoc: string;
};

type CallbackRef = {
  onChange: IMountUpdateListener['onChange'];
  onDocChange: IMountUpdateListener['onDocChange'];
};

interface Props {
  initialEditorState: InitialEditorState;
  onEditorChange?: IMountUpdateListener['onChange'];
  onEditorDocChange?: IMountUpdateListener['onDocChange'];
  typewriterMode?: boolean;
}
/**
 * Return a ref object which to contain the codemirror edito, and a codemirror view instance
 *
 * @author crazycodegame
 */
const useCodemirror = <T extends Element>(props: Props): [React.MutableRefObject<T | null>, EditorView] => {
  const { initialEditorState, onEditorChange, onEditorDocChange, typewriterMode = false } = props;
  const [editorView, setEditorView] = useState<EditorView>(null);
  const containerRef = useRef<T>(null);
  const callbackRef = useRef<CallbackRef>({ onChange: void 0, onDocChange: void 0 });

  // Make sure the editor usees the latest callback function
  useMemo(() => {
    callbackRef.current.onChange = onEditorChange;
    callbackRef.current.onDocChange = onEditorDocChange;
  }, [onEditorChange, onEditorDocChange]);

  useEffect(() => {
    // Can not touch dom container
    if (!containerRef.current) {
      setEditorView(null);
      return;
    }

    const startState = EditorState.create({
      doc: initialEditorState?.initDoc || '',
      extensions: [...defaultExtension(), mountUpdateListener(callbackRef.current), ...dynamicPlugin()]
    });

    const view = new EditorView({
      state: startState,
      parent: containerRef.current
    });

    // It's unclear why there is a deviation?
    // Ensure the editor scrolls to the top after creating a new view
    view.dispatch({ effects: EditorView.scrollIntoView(0) });

    // ============================================================
    // Register global event of codemirror
    // ============================================================
    function mousedown() {
      PluginGlobal.set('didMousePress', true);
    }
    function mouseup() {
      PluginGlobal.set('didMousePress', false);
      const selection = view.state.selection.main;
      view.dispatch({ selection: { anchor: selection.anchor, head: selection.head } });
    }
    document.addEventListener('mousedown', mousedown, true);
    document.addEventListener('mouseup', mouseup, true);

    setEditorView(view);
    renderStore.setEditor(view);

    return () => {
      document.removeEventListener('mousedown', mousedown, true);
      document.removeEventListener('mouseup', mouseup, true);
      renderStore.setEditor(null);
      view.destroy();
    };
  }, [initialEditorState]);

  useEffect(() => {
    if (!editorView) {
      return;
    }

    const effects = [typewriterModeCompartment.reconfigure(typewriterMode ? typewriterModeExtension : [])];
    if (typewriterMode) {
      effects.push(
        EditorView.scrollIntoView(editorView.state.selection.main.head, {
          y: 'center',
          yMargin: 24
        })
      );
    }

    editorView.dispatch({ effects });
  }, [editorView, typewriterMode]);

  return [containerRef, editorView];
};

// ============================================================
// So other default config here
// ============================================================

function defaultExtension() {
  return [
    highlightSpecialChars(),
    history(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    highlightSelectionMatches(),
    EditorView.lineWrapping,
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, ...foldKeymap]),
    markdown({
      base: markdownLanguage,
      codeLanguages: languages,
      addKeymap: true,
      extensions: [markdownTagExtension(), ...nextWriterSyntaxExtension.syntax]
    }),
    typewriterModeCompartment.of([]),
    defaultTheme
  ];
}

// ============================================================
// Theme
// ============================================================

const mdTags = {
  headingMark: Tag.define(),
  quoteMark: Tag.define(),
  listMark: Tag.define(),
  linkMark: Tag.define(),
  emphasisMark: Tag.define(),
  codeMark: Tag.define(),
  codeText: Tag.define(),
  codeInfo: Tag.define(),
  linkTitle: Tag.define(),
  linkLabel: Tag.define(),
  url: Tag.define(),
  inlineCode: Tag.define(),
  tableDelimiter: Tag.define(),
  tableRow: Tag.define()
};

function markdownTagExtension(): MarkdownConfig {
  return {
    props: [
      styleTags({
        HeaderMark: mdTags.headingMark,
        QuoteMark: mdTags.quoteMark,
        ListMark: mdTags.listMark,
        LinkMark: mdTags.linkMark,
        EmphasisMark: mdTags.emphasisMark,
        CodeMark: mdTags.codeMark,
        CodeText: mdTags.codeText,
        CodeInfo: mdTags.codeInfo,
        LinkTitle: mdTags.linkTitle,
        LinkLabel: mdTags.linkLabel,
        URL: mdTags.url,
        InlineCode: mdTags.inlineCode,
        TableDelimiter: mdTags.tableDelimiter,
        TableRow: mdTags.tableRow
      })
    ]
  };
}

// ============================================================
// Typewriter mode
// ============================================================

const TYPEWRITER_FOCUS_RADIUS = 48;
const TYPEWRITER_FADE_RADIUS = 360;

const typewriterModeCompartment = new Compartment();

class TypewriterModePlugin implements PluginValue {
  private animationFrame: number | null = null;
  private readonly view: EditorView;
  private readonly updateCursorY = () => {
    this.scheduleCursorYUpdate(this.view);
  };

  constructor(view: EditorView) {
    this.view = view;
    view.contentDOM.style.setProperty('--nw-typewriter-focus-radius', `${TYPEWRITER_FOCUS_RADIUS}px`);
    view.contentDOM.style.setProperty('--nw-typewriter-fade-radius', `${TYPEWRITER_FADE_RADIUS}px`);
    view.scrollDOM.addEventListener('scroll', this.updateCursorY);
    this.scheduleCursorYUpdate(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.selectionSet || update.geometryChanged) {
      this.scheduleCursorYUpdate(update.view);
    }
  }

  destroy() {
    this.view.scrollDOM.removeEventListener('scroll', this.updateCursorY);
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.view.contentDOM.style.removeProperty('--nw-typewriter-cursor-y');
    this.view.contentDOM.style.removeProperty('--nw-typewriter-focus-radius');
    this.view.contentDOM.style.removeProperty('--nw-typewriter-fade-radius');
  }

  private scheduleCursorYUpdate(view?: EditorView): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.animationFrame = requestAnimationFrame(() => {
      this.animationFrame = null;
      if (!view?.dom.isConnected) {
        return;
      }

      updateTypewriterCursorY(view);
    });
  }
}

const typewriterModeExtension: Extension = [
  EditorView.editorAttributes.of({ class: 'nw-typewriter-mode' }),
  EditorView.baseTheme({
    '&.nw-typewriter-mode .cm-content': {
      WebkitMaskImage:
        'linear-gradient(to bottom, transparent 0, transparent calc(var(--nw-typewriter-cursor-y) - var(--nw-typewriter-fade-radius)), black calc(var(--nw-typewriter-cursor-y) - var(--nw-typewriter-focus-radius)), black calc(var(--nw-typewriter-cursor-y) + var(--nw-typewriter-focus-radius)), transparent calc(var(--nw-typewriter-cursor-y) + var(--nw-typewriter-fade-radius)), transparent 100%)',
      maskImage:
        'linear-gradient(to bottom, transparent 0, transparent calc(var(--nw-typewriter-cursor-y) - var(--nw-typewriter-fade-radius)), black calc(var(--nw-typewriter-cursor-y) - var(--nw-typewriter-focus-radius)), black calc(var(--nw-typewriter-cursor-y) + var(--nw-typewriter-focus-radius)), transparent calc(var(--nw-typewriter-cursor-y) + var(--nw-typewriter-fade-radius)), transparent 100%)',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      transition: 'mask-image 120ms ease, -webkit-mask-image 120ms ease'
    }
  }),
  ViewPlugin.fromClass(TypewriterModePlugin),
  EditorView.updateListener.of(update => {
    if (!update.docChanged && !update.selectionSet) {
      return;
    }

    scrollCursorToTypewriterCenter(update.view);
  })
];

function scrollCursorToTypewriterCenter(view: EditorView): void {
  requestAnimationFrame(() => {
    if (!view.dom.isConnected) {
      return;
    }

    view.dispatch({
      effects: EditorView.scrollIntoView(view.state.selection.main.head, {
        y: 'center',
        yMargin: 24
      })
    });
  });
}

function updateTypewriterCursorY(view: EditorView): void {
  const cursorRect = view.coordsAtPos(view.state.selection.main.head);
  if (!cursorRect) {
    return;
  }

  const contentRect = view.contentDOM.getBoundingClientRect();
  const cursorY = cursorRect.top + (cursorRect.bottom - cursorRect.top) / 2 - contentRect.top;
  view.contentDOM.style.setProperty('--nw-typewriter-cursor-y', `${cursorY}px`);
}

export const nwSyntaxHighlight = HighlightStyle.define([
  // ============================================================
  // content highlight
  // ============================================================
  {
    tag: tags.list,
    color: 'var(--nw-theme-list-content)'
  },
  {
    tag: tags.link,
    color: 'var(--nw-theme-link-content)',
    textDecoration: 'underline',
    fontWeight: 'bold',
    textUnderlineOffset: '4px'
  },
  {
    tag: tags.quote,
    color: 'var(--nw-theme-quote-content)'
  },
  {
    tag: tags.emphasis,
    color: 'var(--nw-theme-emphasis-content)',
    fontStyle: 'italic'
  },
  {
    tag: tags.strong, // bold style
    fontWeight: 'bold',
    color: 'var(--nw-theme-strong-content)'
  },
  {
    tag: tags.heading,
    color: 'var(--nw-theme-head-content)',
    fontWeight: 'bold'
  },
  {
    tag: tags.heading1,
    fontSize: '2em',
    color: 'var(--nw-theme-head-content)',
    fontWeight: 'bold'
  },
  {
    tag: tags.heading2,
    fontSize: '1.8em',
    color: 'var(--nw-theme-head-content)',
    fontWeight: 'bold'
  },
  {
    tag: tags.heading3,
    fontSize: '1.6em',
    color: 'var(--nw-theme-head-content)',
    fontWeight: 'bold'
  },
  {
    tag: tags.heading4,
    fontSize: '1.4em',
    color: 'var(--nw-theme-head-content)',
    fontWeight: 'bold'
  },
  {
    tag: tags.heading5,
    fontSize: '1.2em',
    color: 'var(--nw-theme-head-content)',
    fontWeight: 'bold'
  },
  {
    tag: tags.heading6,
    fontSize: '1em',
    color: 'var(--nw-theme-head-content)',
    fontWeight: 'bold'
  },
  {
    tag: tags.strikethrough, // 删除线
    textDecoration: 'line-through'
  },
  // ============================================================
  // marker highlight
  // ============================================================
  // {
  //   tag: tags.meta,
  //   color: 'var(--nw-theme-quote-mark)'
  // },
  {
    tag: mdTags.headingMark,
    color: 'var(--nw-theme-head-mark)'
  },
  // {
  //   tag: mdTags.quoteMark,
  //   color: 'var(--nw-theme-quote-mark)'
  // },
  {
    tag: mdTags.listMark,
    color: 'var(--nw-theme-list-mark)'
  },
  // {
  //   tag: mdTags.codeMark,
  //   color: 'var(--nw-theme-code-mark)'
  // },
  {
    tag: mdTags.codeInfo,
    color: 'var(--nw-theme-code-info)'
  },
  // {
  //   tag: mdTags.inlineCode,
  //   backgroundColor: 'rgba(175, 184, 193, 0.2)',
  //   paddingInline: '4px',
  //   borderRadius: '4px'
  // },
  // ============================================================
  // code mark highlight
  // ============================================================
  {
    tag: [tags.keyword, tags.typeName, tags.namespace, tags.bracket, tags.operator],
    color: '#D73A4A'
  },
  {
    tag: [tags.string, tags.deleted],
    color: '#032A57'
  },
  {
    tag: tags.variableName,
    color: '#000000'
  },
  {
    tag: [tags.regexp, /*@__PURE__*/ tags.special(tags.string)],
    color: '#E36208'
  },
  {
    tag: /*@__PURE__*/ tags.local(tags.variableName), // not work
    color: 'yellow !important'
  },
  {
    tag: [/*@__PURE__*/ tags.special(tags.variableName), tags.macroName], // not work
    color: 'yellow'
  },
  {
    tag: tags.propertyName,
    color: '#333'
  },
  {
    tag: tags.comment,
    color: '#6A737D'
  },
  {
    tag: tags.invalid, // not work
    color: '#f00'
  },
  {
    tag: [tags.self, tags.null, tags.escape, tags.number, tags.definition(tags.variableName)],
    color: '#015CC5'
  },
  {
    tag: [
      tags.className,
      tags.attributeName,
      tags.function(tags.variableName),
      tags.function(tags.propertyName),
      tags.definition(tags.propertyName)
    ],
    color: '#6F42C1'
  },

  // ============================================================
  // Next Writer syntax extension
  // ============================================================
  ...nextWriterSyntaxExtension.tagStyles
]);

const defaultThemeCss: { [key: string]: CSSProperties | StyleSpec } = {
  '&': {
    // css in cm-editor
    fontSize: '1em',
    height: '100%',
    color: 'var(--nw-editor-text)',
    backgroundColor: 'var(--nw-editor-bg)'
  },
  '.cm-scroller': {
    lineHeight: 1.5,
    fontFamily: 'inherit'
  },
  '&.cm-focused': {
    outline: 'none'
  },
  '&.cm-focused .cm-cursor': {
    borderLeftWidth: '2px'
  },
  '& .cm-content': {
    padding: 0,
    maxWidth: '680px',
    margin: 'auto'
  },
  '& .cm-line': {
    padding: 0
  },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    backgroundColor: 'var(--nw-editor-selection-bg)'
  }
};
const _defaultTheme = EditorView.theme(defaultThemeCss as { [key: string]: StyleSpec });
const defaultTheme = [_defaultTheme, syntaxHighlighting(nwSyntaxHighlight)];

interface IMountUpdateListener {
  onDocChange?: (update: ViewUpdate) => void;
  onChange?: (update: ViewUpdate) => void;
}
/**
 * Mount codemirror editor update callback function
 *
 * @param onDocChange Document change callback function syntax sugar, the latest Editview instance is passed as parameter
 * @param onChange Change callback funciton. Any codemirror editor update will trigger this callback. This ViewUpdate instance is passed in as parameter
 */
function mountUpdateListener(config?: IMountUpdateListener) {
  return EditorView.updateListener.of(update => {
    if (update.docChanged) {
      // Invoke onDocChange
      config.onDocChange && config.onDocChange(update);
    }

    // Invoke onChange
    config.onChange && config.onChange(update);
  });
}

const dynamicViewPlugins = new Compartment();
const dynamicFieldPlugins = new Compartment();
function dynamicPlugin() {
  return [dynamicViewPlugins.of(ViewPlugins()), dynamicFieldPlugins.of(FieldPlugins())];
}

export default useCodemirror;
