import { DEFAULT_CONTENT } from '../components/editor/constants'
import a01 from '../content/a01-特色功能.md?raw'
import a02 from '../content/a02-文档库和文档.md?raw'
import a03 from '../content/a03-基本格式.md?raw'
import a04 from '../content/a04-自动完成.md?raw'
import a05 from '../content/a05-快捷键.md?raw'
import a06 from '../content/a06-大纲视图.md?raw'
import a07 from '../content/a07-即时预览和阅读模式.md?raw'
import a08 from '../content/a08-预览视图.md?raw'
import a09 from '../content/a09-历史记录.md?raw'
import a10 from '../content/a10-拼写检查.md?raw'

export const BUILTIN_DOCS: Record<string, string> = {
  'a01-特色功能': a01,
  'a02-文档库和文档': a02,
  'a03-基本格式': a03,
  'a04-自动完成': a04,
  'a05-快捷键': a05,
  'a06-大纲视图': a06,
  'a07-即时预览和阅读模式': a07,
  'a08-预览视图': a08,
  'a09-历史记录': a09,
  'a10-拼写检查': a10,
}

const BUILTIN_IDS = Object.keys(BUILTIN_DOCS)

export function getDocMd(id: string): string {
  if (id === 'welcome') return DEFAULT_CONTENT
  if (BUILTIN_DOCS[id]) return BUILTIN_DOCS[id]
  try {
    const s = localStorage.getItem(`lzeditor-doc-${id}`)
    if (s) {
      const d = JSON.parse(s)
      if (d.md) return d.md
    }
  } catch {}
  return ''
}

export function getDocHtml(id: string): string {
  if (id === 'welcome') return ''
  if (BUILTIN_IDS.includes(id)) return ''
  try {
    const s = localStorage.getItem(`lzeditor-doc-${id}`)
    if (s) {
      const d = JSON.parse(s)
      if (d.html) return d.html
    }
    const old = localStorage.getItem('lzeditor-doc')
    if (old) {
      const d = JSON.parse(old)
      if (d.html) return d.html
    }
  } catch {}
  return ''
}
