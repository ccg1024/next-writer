import { Extension } from '@codemirror/state'
import { headNavPlugin } from './workUnits/head-nav'
import { images } from './images-extension'
import { inlineEmoji } from './emoji-extension'

export const standaloneScheduler = (): Extension => [
  headNavPlugin(),
  images(),
  inlineEmoji()
]
