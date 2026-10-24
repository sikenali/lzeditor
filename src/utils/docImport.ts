import { mdToHtml } from './mdToHtml'
import { silentError } from './silentError'
import { useEditorStore } from '../store/editorStore'
import { getCM6Editor } from '../components/editor/codemirror/registry'

const MAX_FILE_BYTES = 2 * 1024 * 1024
const MAX_FOLDER_FILES = 100
const MARKDOWN_EXT = /\.(md|markdown|mdown|mkd|txt)$/i

export interface StoredDoc {
  md: string
  html: string
  savedAt: number
}

/** 读取 lzeditor-doc-{id} 的本地存档，没有或解析失败返回 null。 */
export function readStoredDoc(id: string): StoredDoc | null {
  try {
    const raw = localStorage.getItem(`lzeditor-doc-${id}`)
    if (!raw) return null
    const data = JSON.parse(raw)
    return {
      md: typeof data?.md === 'string' ? data.md : '',
      html: typeof data?.html === 'string' ? data.html : '',
      savedAt: typeof data?.savedAt === 'number' ? data.savedAt : 0,
    }
  } catch {
    return null
  }
}

/** 新建标签页并载入 markdown；path 用来标注文件所在的目录。 */
export function openMarkdownDoc(title: string, md: string, path = ''): string {
  const store = useEditorStore.getState()
  const id = store.createDoc(title, path)
  const html = mdToHtml(md)
  store.updateDoc({ md, html, docsMd: { [id]: md } })
  try {
    localStorage.setItem(`lzeditor-doc-${id}`, JSON.stringify({ md, html, savedAt: Date.now() }))
  } catch (e) { silentError('导入文档持久化失败', e) }
  getCM6Editor()?.setText(md)
  return id
}

/** 新建空白文档（和工具栏「新建文档」一致）。 */
export function newBlankDoc(): string {
  const store = useEditorStore.getState()
  const id = store.createDoc('untitled.md')
  store.setLastEditTime(Date.now())
  return id
}

/** 弹出系统文件选择框，取消返回 null。 */
export function pickFile(): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,.mdown,.mkd,.txt'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    try { input.click() } catch { resolve(null) }
  })
}

/** 弹出系统文件夹选择框，取消返回 null。 */
export function pickFolderFiles(): Promise<File[] | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    ;(input as any).webkitdirectory = true
    input.multiple = true
    input.onchange = () => resolve(input.files && input.files.length > 0 ? Array.from(input.files) : null)
    input.oncancel = () => resolve(null)
    try { input.click() } catch { resolve(null) }
  })
}

/** 把选中的文件夹里所有 Markdown 文件逐个开成文档，返回打开的文档 id。 */
export async function importFolderFiles(files: File[]): Promise<string[]> {
  const targets = files
    .filter(f => MARKDOWN_EXT.test(f.name) && f.size <= MAX_FILE_BYTES)
    .sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name))
    .slice(0, MAX_FOLDER_FILES)
  const opened: string[] = []
  for (const file of targets) {
    const md = await file.text().catch(() => '')
    if (!md) continue
    const rel = file.webkitRelativePath || file.name
    const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''
    opened.push(openMarkdownDoc(file.name, md, dir))
  }
  return opened
}

/** 读取单个文件并开成新文档。 */
export async function importSingleFile(file: File): Promise<void> {
  const md = await file.text().catch(() => '')
  openMarkdownDoc(file.name, md)
}
