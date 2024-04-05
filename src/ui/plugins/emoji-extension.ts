import { Extension } from '@codemirror/state'
import {
  Decoration,
  DecorationSet,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  ViewUpdate,
  WidgetType
} from '@codemirror/view'
import twemoji from 'twemoji'
import { emojiList } from '../libs/utils'

const getEmojiByName = (name: string) => {
  if (name === 'joker') {
    return emojiList[134]
  } else if (name === 'smill' || /^h+$/.test(name)) {
    return emojiList[135]
  } else if (name === 'smillcry') {
    return emojiList[138]
  } else if (name === 'sweat') {
    return emojiList[141]
  } else if (name === 'wink') {
    return emojiList[144]
  } else if (name === 'shy') {
    return emojiList[145]
  } else if (name === 'smillkiss') {
    return emojiList[152]
  } else if (name === 'tongue') {
    return emojiList[156]
  } else if (name === 'glasses') {
    return emojiList[160]
  } else if (name === 'cool') {
    return emojiList[161]
  } else if (name === 'thinking') {
    return emojiList[169]
  } else if (name === 'celebrate') {
    return emojiList[131]
  }
  return name
}

class EmojiWidget extends WidgetType {
  emojiName: string

  constructor(name: string) {
    super()
    this.emojiName = name
  }
  eq(emojiWidget: EmojiWidget) {
    return this.emojiName === emojiWidget.emojiName
  }

  toDOM() {
    const emoji = getEmojiByName(this.emojiName)
    const img = twemoji.parse(emoji, {
      base: 'static://',
      folder: 'svg',
      ext: '.svg'
    })
    const span = document.createElement('span')
    span.innerHTML = img
    return span
  }
  ignoreEvent(_event: Event): boolean {
    return false
  }
}

// match emoji string or custom emoji name
const regexExp =
  /:\{([\u231a-\u27ff\u2b50\u2b1b\u2b1c]\ufe0f|\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\w+)\}:/gi

const emojiMatcher = new MatchDecorator({
  regexp: regexExp,
  decoration: match =>
    Decoration.replace({
      widget: new EmojiWidget(match[1])
    })
})

export const emojier = ViewPlugin.fromClass(
  class {
    emojiers: DecorationSet
    constructor(view: EditorView) {
      this.emojiers = emojiMatcher.createDeco(view)
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.emojiers = emojiMatcher.updateDeco(update, this.emojiers)
      }
    }
  },
  {
    decorations: instance => instance.emojiers,
    provide: plugin =>
      EditorView.atomicRanges.of(view => {
        return view.plugin(plugin)?.emojiers || Decoration.none
      })
  }
)

export const emojiTheme = EditorView.baseTheme({
  'img.emoji': {
    height: '1em',
    width: '1em',
    margin: '0 .05em 0 .1em',
    verticalAlign: '-0.1em'
  }
})

export function inlineEmoji(): Extension {
  return [emojiTheme, emojier]
}
