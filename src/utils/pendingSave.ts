import { useEditorStore } from '../store/editorStore'
import { silentError } from './silentError'
import { toast } from './toast'

export interface PendingEdit {
  md: string
  html: string
}

let pending: PendingEdit | null = null
let warned = false

export function setPendingEdit(edit: PendingEdit | null): void {
  pending = edit
}

/**
 * 一次编辑真正落下去：版本快照 + 本地存储。
 *
 * 从 CM6 的防抖回调里抽出来，pagehide 兜底也要用同一个入口，
 * 否则两处各写一份落盘逻辑，迟早有一份写错。
 */
export function persistEdit(docId: string, { md, html }: PendingEdit): void {
  const store = useEditorStore.getState()
  store.addVersion({
    id: String(Date.now()),
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    date: new Date().toLocaleDateString('zh-CN'),
    desc: md.trim().slice(0, 24) || '空文档',
    changes: md.length,
    html,
    md,
  })
  store.setSyncStatus('synced')
  try {
    localStorage.setItem(`lzeditor-doc-${docId}`, JSON.stringify({ md, html, savedAt: Date.now() }))
    warned = false
  } catch (e) {
    silentError('保存文档失败', e)
    // 一次会话只提示一次：配额满时防抖回调会连续触发，刷十条 toast 反而更糟
    if (!warned) {
      warned = true
      // toast 内部是 document.body.appendChild，pagehide 时 body 可能已经被拆掉。
      // 这里抛出来会把整次 flush 打断，所以单独兜一层——数据已经写完，只差通知。
      try {
        toast('本地存储已满，最新改动可能没保存', { type: 'warning' })
      } catch (t) {
        silentError('提示框创建失败', t)
      }
    }
  }
}

/**
 * 关闭页面前把还没到防抖窗口的那次编辑写下去。
 * 800ms 的防抖意味着硬关窗口必然丢最后一段输入。
 */
export function flushPendingEdit(): void {
  if (!pending) return
  setPendingEdit(null)
  const docId = useEditorStore.getState().activeDocId
  if (!docId) return
  persistEdit(docId, pending)
}
