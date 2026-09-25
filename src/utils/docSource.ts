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
import b01 from '../content/b01-链接.md?raw'
import b02 from '../content/b02-图像.md?raw'
import b03 from '../content/b03-脚注.md?raw'
import b04 from '../content/b04-任务列表.md?raw'
import b05 from '../content/b05-表格.md?raw'
import b06 from '../content/b06-图表.md?raw'
import b07 from '../content/b07-代码块.md?raw'
import b08 from '../content/b08-html代码.md?raw'
import b09 from '../content/b09-LaTeX数学公式.md?raw'
import b10 from '../content/b10-高级格式.md?raw'

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
  'b01-链接': b01,
  'b02-图像': b02,
  'b03-脚注': b03,
  'b04-任务列表': b04,
  'b05-表格': b05,
  'b06-图表': b06,
  'b07-代码块': b07,
  'b08-html代码': b08,
  'b09-LaTeX数学公式': b09,
  'b10-高级格式': b10,
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
