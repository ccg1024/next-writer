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
    return emojiList[139]
  } else if (name === 'smill' || /^h+$/.test(name)) {
    return emojiList[140]
  } else if (name === 'smill1') {
    return emojiList[141]
  } else if (name === 'smill2') {
    return emojiList[142]
  } else if (name === 'smillcry') {
    return emojiList[143]
  } else if (name === 'smill3') {
    return emojiList[144]
  } else if (name === 'smill4') {
    return emojiList[145]
  } else if (name === 'sweat') {
    return emojiList[146]
  } else if (name === 'smill5') {
    return emojiList[147]
  } else if (name === 'smillangle') {
    return emojiList[148]
  } else if (name === 'wink') {
    return emojiList[149]
  } else if (name === 'shy') {
    return emojiList[150]
  } else if (name === 'smillnorm') {
    return emojiList[151]
  } else if (name === 'smillnormr') {
    return emojiList[152]
  } else if (name === 'smilltricksy') {
    return emojiList[153]
  } else if (name === 'smilllove') {
    return emojiList[156]
  } else if (name === 'smillkiss') {
    return emojiList[157]
  } else if (name === 'smillkiss1') {
    return emojiList[158]
  } else if (name === 'smillkiss2') {
    return emojiList[159]
  } else if (name === 'smillkiss3') {
    return emojiList[160]
  } else if (name === 'tongue') {
    return emojiList[161]
  } else if (name === 'tongue1') {
    return emojiList[162]
  } else if (name === 'tongue2') {
    return emojiList[163]
  } else if (name === 'tongue3') {
    return emojiList[164]
  } else if (name === 'glasses') {
    return emojiList[165]
  } else if (name === 'cool') {
    return emojiList[166]
  } else if (name === 'thinking') {
    return emojiList[174]
  } else if (name === 'celebrate') {
    return emojiList[136]
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
  /:\{(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\w+)\}:/gi

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
