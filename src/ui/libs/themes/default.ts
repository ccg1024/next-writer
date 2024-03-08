import { EditorView } from '@codemirror/view'
import { Extension } from '@codemirror/state'
import { tags } from '@lezer/highlight'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'

import { markTags } from '../codemirror'

export const defaultTheme = EditorView.theme({
  '&': {
    // backgroundColor: 'transparent !important',
    height: '100%',
    fontSize: '1.0em',
    padding: '12px',
    width: '80%',
    margin: 'auto'
  },
  '&.cm-focused': {
    outline: 'none'
  },
  // '&.cm-focused .cm-cursor': {
  //   transition: 'all 80ms'
  // },
  '.cm-scroller': {
    fontFamily: 'inherit !important',
    marginTop: '5px',
    overflow: 'unset'
  },
  '&.cm-editor': {
    textAlign: 'left',
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
    paddingLeft: '2px',
    paddingRight: '2px'
  },
  '.cm-content': {
    // marginRight: '5px'
    paddingBottom: '80vh',
    wordBreak: 'break-all'
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
    backgroundColor: 'transparent',
    borderTopRightRadius: '2px',
    borderBottomRightRadius: '2px'
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
    head: '#586EA5',
    quote: '#839496',
    emphasis: '#FD5455',
    list: '#000000',
    url: '#718096',
    link: '#68D391',
    inlineCode: '#4299E1'
  },
  markers: {
    headMark: '#A9B8CC',
    quoteMark: '#CBD5E0',
    listMark: '#A0AEC0',
    linkMark: '#A9B8CC',
    empahsisMark: '#FC8181',
    codeMark: '#A0AEC0',
    codeText: '#000000',
    codeInfo: '#000000',
    linkTitle: 'blue',
    linkLabel: 'blue',
    tableDelimiter: '#A0AEC0'
  },
  backgroundColor: {
    inlineCode: '#EBF8FF'
  }
}

export const defaultSyntaxHighlighting = HighlightStyle.define([
  {
    tag: tags.list, // for ul or ol list content.
    color: defaultColor.content.list
  },
  {
    tag: tags.link,
    color: defaultColor.content.link
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
    color: defaultColor.content.emphasis
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
    tag: markTags.emphasisMark,
    color: defaultColor.markers.empahsisMark
  },
  {
    tag: markTags.codeMark,
    color: defaultColor.markers.codeMark
  },
  {
    tag: markTags.codeInfo,
    color: defaultColor.markers.codeInfo
  },
  // {
  //   tag: markTags.linkTitle, // no characters found
  //   colors: customColors.markers.linkTitle
  // },
  // {
  //   tag: markTags.linkLabel, // no characters found
  //   color: customColors.markers.linkLabel
  // },
  {
    tag: markTags.url,
    color: defaultColor.content.url
  },
  {
    tag: markTags.inlineCode,
    color: defaultColor.content.inlineCode,
    backgroundColor: 'rgba(175, 184, 193, 0.2)',
    borderRadius: 'var(--nw-border-radius-sm)'
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
  }
])

export const defaultLight: Extension = [
  defaultTheme,
  syntaxHighlighting(defaultSyntaxHighlighting)
]
