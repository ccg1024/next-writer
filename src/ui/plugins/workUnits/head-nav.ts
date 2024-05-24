// 未迁移至视图调度器中
// 独立运行插件周期
import { EditorState, Extension } from '@codemirror/state'
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { pub } from 'src/ui/libs/pubsub'
import { HeadNav } from '_types'

const headNav = ViewPlugin.fromClass(
  class {
    pat = /^#{1,6}\s.*$/
    headNav: HeadNav[] = []
    debounceTimer: NodeJS.Timeout
    constructor(view: EditorView) {
      this.publicNavigation(view)
    }
    update(update: ViewUpdate) {
      if (!update.docChanged) return

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }
      this.debounceTimer = setTimeout(() => {
        this.publicNavigation(update.view)
      }, 500)
    }
    destroy() {
      this.headNav = null
    }

    rippe(state: EditorState): HeadNav[] {
      const workInHeadNav: HeadNav[] = []
      const tokens = state.doc.toString().split('\n')
      for (let i = 0; i < tokens.length; i++) {
        if (!this.pat.test(tokens[i])) continue

        const _token = tokens[i].split(' ')
        workInHeadNav.push({
          title: _token.slice(1).join(' '),
          level: _token[0].length,
          number: i + 1,
          jumpPos: state.doc.line(i + 1).from
        })
      }
      return workInHeadNav
    }
    publicNavigation(view: EditorView) {
      const headNav = this.rippe(view.state)
      pub('nw-head-nav-pubsub', {
        type: 'heads-list',
        data: { heads: headNav }
      })
    }
  }
)

export const headNavPlugin = (): Extension => [headNav]
