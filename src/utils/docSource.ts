import { DEFAULT_CONTENT } from '../components/editor/constants'

export function getDocMd(id: string): string {
  if (id === 'welcome') return DEFAULT_CONTENT
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