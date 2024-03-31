import {
  keymap,
  EditorView,
  highlightSpecialChars,
  drawSelection,
  highlightActiveLine,
  dropCursor,
  rectangularSelection,
  highlightActiveLineGutter,
  placeholder
} from '@codemirror/view'
import { Compartment, EditorState } from '@codemirror/state'
import {
  indentOnInput,
  bracketMatching,
  foldKeymap
} from '@codemirror/language'
import {
  history,
  defaultKeymap,
  historyKeymap,
  indentWithTab
} from '@codemirror/commands'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap
} from '@codemirror/autocomplete'

import { languages } from '@codemirror/language-data'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { Tag, styleTags } from '@lezer/highlight'
import { MarkdownConfig } from '@lezer/markdown'
import { NWvideo } from '../plugins/sytanx-extension'

export const markTags = {
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
}

const markStylingExtension: MarkdownConfig = {
  props: [
    styleTags({
      HeaderMark: markTags.headingMark,
      QuoteMark: markTags.quoteMark,
      ListMark: markTags.listMark,
      LinkMark: markTags.linkMark,
      EmphasisMark: markTags.emphasisMark,
      CodeMark: markTags.codeMark,
      CodeText: markTags.codeText,
      CodeInfo: markTags.codeInfo,
      LinkTitle: markTags.linkTitle,
      LinkLabel: markTags.linkLabel,
      URL: markTags.url,
      InlineCode: markTags.inlineCode,
      TableDelimiter: markTags.tableDelimiter,
      TableRow: markTags.tableRow
    })
  ]
}

export const themePlugin = new Compartment()

export const editorDefaultExtensions = [
  highlightActiveLineGutter(),
  highlightSpecialChars(),
  history(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  themePlugin.of([]),
  bracketMatching(),
  closeBrackets(),
  autocompletion(),
  rectangularSelection(),
  highlightActiveLine(),
  highlightSelectionMatches(),
  keymap.of([
    indentWithTab,
    ...closeBracketsKeymap,
    ...defaultKeymap,
    ...searchKeymap,
    ...historyKeymap,
    ...foldKeymap
  ]),
  EditorView.lineWrapping,
  placeholder('Welcome to next writer...'),
  markdown({
    base: markdownLanguage,
    codeLanguages: languages,
    addKeymap: true,
    extensions: [markStylingExtension, NWvideo]
  })
]
