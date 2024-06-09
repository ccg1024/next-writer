import { EditorView } from '@codemirror/view'
import { Extension } from '@codemirror/state'
import { tags } from '@lezer/highlight'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'

import { markTags } from '../codemirror'
import { syntaxTags } from '../../plugins/sytanx-extension'

export const defaultTheme = EditorView.theme({
  '&': {
    // backgroundColor: 'transparent !important',
    height: '100%',
    fontSize: '1.0em',
    padding: '12px'
    // width: '80%',
    // margin: 'auto'
  },
  '&.cm-focused': {
    outline: 'none'
  },
  '&.cm-focused .cm-cursor': {
    transition: 'left 80ms ease-out, top 80ms ease-out',
    borderLeft: '3.2px solid black'
  },
  '.cm-scroller': {
    fontFamily: 'var(--nw-editor-font-family)',
    // marginTop: '20px',
    marginBottom: '20px',
    padding: '0 10%',
    justifyContent: 'center'
  },
  '.cm-scroller::before': {
    content: "''",
    width: '100%',
    position: 'absolute',
    height: '2px',
    backgroundColor: 'white'
  },
  '&.cm-editor': {
    // textAlign: 'left',
    padding: '0'
  },
  '.cm-gutters': {
    backgroundColor: '#ffffff',
    color: '#8f8f8f'
  },
  '.cm-gutters .cm-gutterElement': {
    paddingLeft: '1em',
    paddingRight: '10px',
    borderTopLeftRadius: '2px',
    borderBottomLeftRadius: '2px'
  },
  '.cm-line': {
    padding: '0px'
  },
  '.cm-content': {
    paddingTop: 'var(--nw-editor-content-padding)',
    paddingBottom: '50vh',
    textAlign: 'var(--nw-editor-text-align)',
    maxWidth: '580px',
    lineHeight: '1.5',
    letterSpacing: 'var(--nw-letter-spacing)'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#cccccc44'
  },
  '.cm-fat-cursor': {
    background: '#48BB78' + ' !important'
  },
  '&:not(.cm-focused) .cm-fat-cursor': {
    background: 'none !important',
    outline: 'solid 1px' + '#48BB78' + '  !important',
    color: 'transparent !important'
  },
  '.cm-activeLine': {
    // backgroundColor: '#cccccc44',
    backgroundColor: 'transparent'
  },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
    // backgroundColor: '#d9d9d966'
  },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer': {
    // zIndex: '99 !important'
  }
})

const defaultColor = {
  content: {
    head: 'var(--nw-theme-head-content)',
    quote: 'var(--nw-theme-quote-content)',
    emphasis: 'var(--nw-theme-emphasis-content)',
    strong: 'var(--nw-theme-strong-content)',
    list: 'var(--nw-theme-list-content)',
    url: 'var(--nw-theme-url-content)',
    link: 'var(--nw-theme-link-content)',
    inlineCode: 'var(--nw-theme-inline-code-content)'
  },
  markers: {
    headMark: 'var(--nw-theme-head-mark)',
    quoteMark: 'var(--nw-theme-quote-mark)',
    listMark: 'var(--nw-theme-list-mark)',
    linkMark: 'var(--nw-theme-link-mark)',
    codeMark: 'var(--nw-theme-code-mark)',
    codeInfo: 'var(--nw-theme-code-info)',
    tableDelimiter: 'var(--nw-theme-table-delimiter)'
  }
}

export const defaultSyntaxHighlighting = HighlightStyle.define([
  {
    tag: tags.list, // for ul or ol list content.
    color: defaultColor.content.list
  },
  {
    tag: tags.link,
    color: defaultColor.content.link,
    textDecoration: 'underline',
    fontWeight: 'bold'
  },
  {
    tag: tags.quote,
    color: defaultColor.content.quote
  },
  {
    tag: tags.emphasis, // italic style
    color: defaultColor.content.emphasis,
    fontStyle: 'italic'
  },
  {
    tag: tags.strong, // bold style
    fontWeight: 'bold',
    color: defaultColor.content.strong
  },
  {
    tag: tags.heading, // table head and title head 1 - 6
    color: defaultColor.content.head,
    fontSize: '1em',
    fontWeight: 'bold'
  },
  {
    tag: tags.heading1,
    fontSize: '2em',
    color: defaultColor.content.head,
    fontWeight: 'bold'
  },
  {
    tag: tags.heading2,
    fontSize: '1.8em',
    color: defaultColor.content.head,
    fontWeight: 'bold'
  },
  {
    tag: tags.heading3,
    fontSize: '1.6em',
    color: defaultColor.content.head,
    fontWeight: 'bold'
  },
  {
    tag: tags.heading4,
    fontSize: '1.4em',
    color: defaultColor.content.head,
    fontWeight: 'bold'
  },
  {
    tag: tags.heading5,
    fontSize: '1.2em',
    color: defaultColor.content.head,
    fontWeight: 'bold'
  },
  {
    tag: tags.strikethrough, // 删除线
    textDecoration: 'line-through'
  },
  // ------ for marker highlight
  {
    tag: markTags.headingMark,
    color: defaultColor.markers.headMark,
    textDecoration: 'none'
  },
  {
    tag: markTags.quoteMark,
    color: defaultColor.markers.quoteMark
  },
  {
    tag: markTags.listMark,
    color: defaultColor.markers.listMark
  },
  {
    tag: markTags.linkMark,
    color: defaultColor.markers.linkMark,
    textDecoration: 'none'
  },
  {
    tag: markTags.codeMark,
    color: defaultColor.markers.codeMark,
    fontFamily: 'var(--nw-editor-code-font-family)'
  },
  {
    tag: markTags.codeInfo,
    color: defaultColor.markers.codeInfo
  },
  {
    tag: markTags.url,
    color: defaultColor.content.url
  },
  {
    tag: markTags.inlineCode,
    color: 'black',
    backgroundColor: 'rgba(175, 184, 193, 0.2)',
    fontFamily: 'var(--nw-editor-code-font-family)'
  },
  {
    tag: markTags.tableDelimiter,
    color: defaultColor.markers.tableDelimiter
  },
  {
    tag: tags.meta, // could be delete mark ~~some~~.
    color: defaultColor.markers.quoteMark
  },
  // for code block highlight
  {
    tag: [
      tags.keyword,
      tags.typeName,
      tags.namespace,
      tags.bracket,
      tags.operator
    ],
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
    tag: [
      tags.self,
      tags.null,
      tags.escape,
      tags.number,
      tags.definition(tags.variableName)
    ],
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
  {
    tag: syntaxTags.NWvideo,
    color: '#6F42C1',
    fontWeight: 'bold'
  }
])

export const defaultLight: Extension = [
  defaultTheme,
  syntaxHighlighting(defaultSyntaxHighlighting)
]
