import { DEFAULT_CONTENT, README_CONTENT } from '../components/editor/constants'
import { silentError } from './silentError'
import { htmlToMarkdown } from './htmlToMd'

export const BUILTIN_DOCS: Record<string, string> = {}

function readLocalDoc(id: string): { md?: string; html?: string } | null {
  try {
    const s = localStorage.getItem(`lzeditor-doc-${id}`)
    return s ? (JSON.parse(s) as { md?: string; html?: string }) : null
  } catch {
    return null
  }
}

/**
 * 取一篇文档的 Markdown。
 * 本地有用户改动过的版本就返回本地版本（内置手册也是文档，改了就得留住），
 * 否则回落到内置内容。还原出厂内容走 resetDocContent。
 *
 * readme 是特例：它的富文本加载走 HTML（见 getDocHtml），因为 htmlToMarkdown
 * 往返会破坏里面的居中段落和原始 HTML。所以 readme 的 markdown 只是按需派生，
 * 供代码模式、导出、侧边预览这类只能吃 markdown 的地方使用。
 */
export function getDocMd(id: string): string {
  if (id === 'readme') {
    const local = readLocalDoc(id)
    return local?.md || (local?.html ? htmlToMarkdown(local.html) : '') || README_CONTENT
  }
  if (id === 'welcome') return DEFAULT_CONTENT
  const local = readLocalDoc(id)
  if (local?.md) return local.md
  return BUILTIN_DOCS[id] || ''
}

export function getDocHtml(id: string): string {
  const local = readLocalDoc(id)
  if (local?.html) return local.html
  if (id === 'readme' || id === 'welcome') return ''
  try {
    const old = localStorage.getItem('lzeditor-doc')
    if (old) {
      const d = JSON.parse(old)
      if (d.html) return d.html
    }
  } catch (e) { silentError('读取文档覆盖内容失败', e) }
  return ''
}
