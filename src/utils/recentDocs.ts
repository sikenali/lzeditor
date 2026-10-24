import { readStoredDoc, openMarkdownDoc } from './docImport'
import { useEditorStore } from '../store/editorStore'

export interface RecentDoc {
  id: string
  title: string
  path: string
  savedAt: number
}

const DOC_KEY_PREFIX = 'lzeditor-doc-'
// readme 是出厂欢迎文档，不算「用户的最近文档」
const BUILTIN_IDS = new Set(['readme'])

function titleFromMarkdown(md: string): string {
  const line = md.split('\n').find(l => /^\s{0,3}#{1,6}\s+\S/.test(l))
  if (!line) return ''
  return line.replace(/^\s{0,3}#{1,6}\s+/, '').replace(/[*_`~]/g, '').trim()
}

/** 最近文档：按 lzeditor-doc-* 落盘时间倒序，排除内置/手册文档。 */
export function getRecentDocs(limit = 6): RecentDoc[] {
  const docs = useEditorStore.getState().docs as Array<any>
  const byId = new Map(docs.map(d => [d.id, d]))
  const out: RecentDoc[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith(DOC_KEY_PREFIX)) continue
    const id = key.slice(DOC_KEY_PREFIX.length)
    if (BUILTIN_IDS.has(id)) continue
    const stored = readStoredDoc(id)
    if (!stored?.savedAt) continue
    const meta = byId.get(id)
    if (meta?.system) continue
    const title = meta?.title || titleFromMarkdown(stored.md) || '未命名文档'
    out.push({ id, title, path: meta?.path || '', savedAt: stored.savedAt })
  }
  return out.sort((a, b) => b.savedAt - a.savedAt).slice(0, limit)
}

/** 打开最近文档：标签页还在就直接切过去，关掉了就用本地存档重建。 */
export function openRecentDoc(doc: RecentDoc): void {
  const store = useEditorStore.getState()
  if (store.docs.some((d: any) => d.id === doc.id)) {
    store.switchDoc(doc.id)
    return
  }
  openMarkdownDoc(doc.title, readStoredDoc(doc.id)?.md || '', doc.path)
}

/** 相对时间：刚刚 / x 分钟前 / x 小时前 / 昨天 / x 天前 / YYYY-MM-DD。 */
export function formatRelativeTime(ts: number): string {
  const minutes = Math.floor((Date.now() - ts) / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days === 1) return '昨天'
  if (days < 30) return `${days} 天前`
  const date = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
