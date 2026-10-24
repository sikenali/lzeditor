import type { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { type Extension } from '@codemirror/state'

export interface SlashRange {
  /** "/" 在文档里的字符偏移 */
  from: number
  filter: string
}

/** LZEditor 侧的接收方："/" 触发的命令面板 */
export interface SlashHost {
  open: (view: EditorView, range: SlashRange) => void
  close: () => void
}

let host: SlashHost | null = null

export function setSlashHost(next: SlashHost | null): void {
  host = next
}

/** 光标前最近的 `/\w*`；没有则返回 null。只往前看 60 个字符，避免整篇扫描。 */
export function slashRange(state: EditorState): SlashRange | null {
  const { from } = state.selection.main
  const text = state.doc.sliceString(Math.max(0, from - 60), from)
  const match = text.match(/\/([^\s]*)$/)
  if (!match) return null
  return { from: from - match[0].length, filter: match[1] }
}

/**
 * 内容变化时探测 `/` 触发，通知命令面板。放在这里而不是监听 input 事件：
 * CM6 走自己的 transaction 管线，input 上 preventDefault 拦不住已入文的字符。
 */
export const slashPaletteExtension: Extension = EditorView.updateListener.of((update) => {
  if (!host || !update.docChanged) return
  const range = slashRange(update.state)
  if (range) host.open(update.view, range)
  else host.close()
})
