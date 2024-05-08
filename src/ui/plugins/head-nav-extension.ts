import { ensureSyntaxTree } from '@codemirror/language'
import { Extension } from '@codemirror/state'
import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view'
import { HeadNav } from '_types'
import { pub } from '../libs/pubsub'

const headNavPlugin = ViewPlugin.fromClass(
  class {
    headNav: HeadNav[] = []
    debounceTimer: NodeJS.Timeout
    minPos = -1
    headsList: string[] = [
      'ATXHeading1',
      'ATXHeading2',
      'ATXHeading3',
      'ATXHeading4',
      'ATXHeading5',
      'ATXHeading6'
    ]

    constructor(view: EditorView) {
      this._startUpdate(view, 0, view.state.doc.length)
    }
    update(update: ViewUpdate) {
      if (update.docChanged) {
        update.changes.iterChangedRanges((fromA, _toA, _fromB, _toB) => {
          if (this.debounceTimer) {
            clearTimeout(this.debounceTimer)
          }

          if (this.minPos === -1 || this.minPos > fromA) {
            this.minPos = fromA
          }
          this.debounceTimer = setTimeout(() => {
            this._startUpdate(
              update.view,
              this.minPos,
              update.view.state.doc.length
            )
            this.minPos = -1
          }, 500)
        })
      }
    }
    destroy() {
      this.headNav = null
    }
    _startUpdate(view: EditorView, from: number, to: number) {
      const startLine = view.state.doc.lineAt(from)
      const unchangedHead = this.headNav.filter(head => {
        if (head.number < startLine.number) return true
      })
      ensureSyntaxTree(view.state, to, 200).iterate({
        from,
        to,
        enter: node => {
          if (this.headsList.includes(node.name)) {
            const line = view.state.doc.lineAt(node.from)
            unchangedHead.push({
              number: line.number,
              title: line.text,
              level: parseInt(node.name[node.name.length - 1]),
              jumpPos: line.from
            })
          }
        }
      })
      this.headNav = unchangedHead
      pub('nw-head-nav-pubsub', {
        type: 'heads-list',
        data: { heads: this.headNav }
      })
      // PubSub.publish('nw-head-nav-pubsub', {
      //   type: 'heads-list',
      //   data: { heads: this.headNav }
      // })
    }
  }
)

export function headNav(): Extension {
  return [headNavPlugin]
}
