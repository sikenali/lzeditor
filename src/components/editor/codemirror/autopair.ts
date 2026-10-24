import { EditorView } from '@codemirror/view'
import { type Extension } from '@codemirror/state'

// 引号（" ' “ ‘ 「 『）的配对与智能替换在 input-format.ts，这里只管括号类符号，
// 避免两个 handler 对同一个按键各改一次。
const PAIR_MAP: Record<string, string> = {
  '(': ')', ')': ')',
  '[': ']', ']': ']',
  '{': '}', '}': '}',
  '<': '>', '>': '>',
  '`': '`',
  '【': '】', '〔': '〕',
  '〈': '〉', '《': '》',
}

const CLOSING = new Set([')', ']', '}', '>', '】', '〕', '〉', '》', '`'])

export const autoPairOff: Extension = []
export const autoPairOn: Extension = []

export function setupAutoPair(view: EditorView, _enabled: boolean): void {
  const handler = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const ch = e.key
    if (!PAIR_MAP.hasOwnProperty(ch)) return

    const { state, dispatch } = view
    const { from, to } = state.selection.main
    const nextChar = state.doc.sliceString(to, to + 1)

    if (ch === '`' && nextChar === '`') {
      e.preventDefault()
      dispatch({
        changes: { from: to, to: to + 1, insert: '' },
        selection: { anchor: to },
        userEvent: 'input.type',
      })
      return
    }

    if (nextChar && CLOSING.has(nextChar)) {
      e.preventDefault()
      dispatch({
        changes: { from: to, insert: '' },
        selection: { anchor: to + 1, head: to + 1 },
        userEvent: 'input.type',
      })
      return
    }

    e.preventDefault()
    dispatch({
      changes: { from: to, insert: PAIR_MAP[ch] },
      selection: { anchor: from + 1, head: from + 1 },
      userEvent: 'input.type',
    })
  }
  view.dom.addEventListener('keydown', handler)
  ;(view.dom as any)._autoPairHandler = handler
}

export function teardownAutoPair(view: EditorView): void {
  const handler = (view.dom as any)._autoPairHandler
  if (handler) {
    view.dom.removeEventListener('keydown', handler)
    delete (view.dom as any)._autoPairHandler
  }
}
