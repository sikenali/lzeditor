import { useEditorStore } from '../store/editorStore'
import { useSettingsStore, saveSettingsToStorage } from '../store/settingsStore'
import { persistCatalog } from './docCatalog'
import { getDocMd } from './docSource'
import { getEditorFacade } from '../components/editor/facade/registry'

/**
 * 文档库整体备份/恢复。
 *
 * 备份是一个 JSON 文件：目录、每篇文档的正文/HTML、设置（含 API Key，便于换机）。
 * 恢复会覆盖当前文档库与设置；浏览器/LPK 里用 Blob 下载与 <input type=file> 上传，
 * 不依赖 Electron。
 */

export const BACKUP_APP = 'lzeditor-backup'
export const BACKUP_VERSION = 1

interface BackupDocData {
  md?: string
  html?: string
  savedAt?: number
}

export interface BackupData {
  app: typeof BACKUP_APP
  version: number
  exportedAt: number
  docs: Array<Record<string, unknown>>
  docLibraries: Array<{ id: string; name: string }>
  activeDocId: string
  nextUntitledIdx: number
  docsMd: Record<string, string>
  docData: Record<string, BackupDocData>
  settings: Record<string, unknown>
}

export function buildBackup(): BackupData {
  const es = useEditorStore.getState() as any
  const docData: Record<string, BackupDocData> = {}
  for (const doc of es.docs || []) {
    try {
      const raw = localStorage.getItem(`lzeditor-doc-${doc.id}`)
      if (raw) docData[doc.id] = JSON.parse(raw)
    } catch { /* 单篇损坏不影响整份备份 */ }
  }
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    docs: es.docs || [],
    docLibraries: es.docLibraries || [],
    activeDocId: es.activeDocId || '',
    nextUntitledIdx: es.nextUntitledIdx || 1,
    docsMd: es.docsMd || {},
    docData,
    settings: useSettingsStore.getState() as unknown as Record<string, unknown>,
  }
}

/** 生成备份文件并触发下载，返回文件名。 */
export function downloadBackup(): string {
  const data = buildBackup()
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const name = `lzeditor-backup-${stamp}.json`
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return name
}

function isBackup(v: any): v is BackupData {
  return !!v && v.app === BACKUP_APP && Array.isArray(v.docs) && typeof v.version === 'number'
}

/** 恢复备份。返回文档数量；数据格式不对或写入失败时抛错。 */
export function restoreBackup(text: string): number {
  let parsed: any
  try { parsed = JSON.parse(text) } catch { throw new Error('备份文件不是有效的 JSON') }
  if (!isBackup(parsed)) throw new Error('不是 lzeditor 备份文件')
  const data = parsed as BackupData

  const docs = data.docs.filter((d: any) => d && typeof d.id === 'string')
  if (!docs.length) throw new Error('备份里没有文档')

  // 先写正文：localStorage 容量不足时尽早失败，避免只恢复了一半目录。
  for (const [id, entry] of Object.entries(data.docData || {})) {
    try {
      localStorage.setItem(`lzeditor-doc-${id}`, JSON.stringify(entry))
    } catch {
      throw new Error('存储空间不足，正文未能全部写入')
    }
  }

  const activeDocId: string = docs.some((d: any) => d.id === data.activeDocId)
    ? String(data.activeDocId)
    : String(docs[0].id)
  const docLibraries = Array.isArray(data.docLibraries) && data.docLibraries.length
    ? data.docLibraries
    : [{ id: 'default', name: 'Default' }]

  useEditorStore.setState({
    docs,
    docLibraries,
    activeDocId,
    nextUntitledIdx: typeof data.nextUntitledIdx === 'number' ? data.nextUntitledIdx : 1,
    docsMd: data.docsMd || {},
    mdContent: (data.docsMd || {})[activeDocId] || '',
    docHTML: '',
    showWelcome: false,
  } as any)

  persistCatalog({
    docs: docs.map((d: any) => ({
      id: d.id,
      title: d.title,
      path: d.path || '',
      libraryId: d.libraryId,
      diskPath: d.diskPath,
      system: d.system,
      builtin: d.builtin,
    })),
    docLibraries,
    nextUntitledIdx: typeof data.nextUntitledIdx === 'number' ? data.nextUntitledIdx : 1,
    activeDocId,
  })

  if (data.settings && typeof data.settings === 'object') {
    useSettingsStore.setState(data.settings as any)
    saveSettingsToStorage(useSettingsStore.getState())
  }

  // 编辑器已挂载时把当前文档内容换成恢复后的内容。
  try { getEditorFacade()?.setText(getDocMd(activeDocId)) } catch { /* ignore */ }
  return docs.length
}
