import { create } from 'zustand'
import type { EditorStoreState, DocVersion } from '../shared/types'
import { DEFAULT_DOC_TITLE } from '../components/editor/constants'
import { getDocMd } from '../utils/docSource'
import { getEditorFacade } from '../components/editor/facade/registry'
import { persistCatalog, restoreSession, type CatalogEntry } from '../utils/docCatalog'
import { loadVersions, saveVersions } from '../utils/versionPersistence'
import { PREVIEW_MODE_OFF_VERSION } from './settingsStore'

const MAX_VERSIONS = 10

/** Load persisted layout state from localStorage. */
function loadLayoutState(): { showOutline: boolean; showPreview: boolean; showLibrary: boolean; statusbarCollapsed: boolean } {
  try {
    const raw = localStorage.getItem('lzeditor-layout')
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        showOutline: typeof parsed.showOutline === 'boolean' ? parsed.showOutline : false,
        // 未显式保存过预览开关时，按默认「仅源码编辑器」处理（与下方设置回落一致）
        showPreview: typeof parsed.showPreview === 'boolean' ? parsed.showPreview : false,
        showLibrary: typeof parsed.showLibrary === 'boolean' ? parsed.showLibrary : false,
        statusbarCollapsed: typeof parsed.statusbarCollapsed === 'boolean' ? parsed.statusbarCollapsed : false,
      }
    }
  } catch {}
  // 首次运行没有布局记录：预览开关回落到设置页的「记住预览状态」，
  // 否则 previewModeEnabled 永远只写不读。
  // lzeditor-settings 在从未改过设置时尚未写入 localStorage，JSON.parse('') 会抛错；
  // 必须按设置默认值 previewModeEnabled=false（=仅源码编辑器）处理，不能误判为 true。
  let preview = false
  try {
    const raw = localStorage.getItem('lzeditor-settings')
    if (raw) {
      const s = JSON.parse(raw)
      // 迁移：v1 默认 previewModeEnabled=true（分屏），v2 起默认 false。
      // 老存档里的 true 是旧默认值全量落盘，并非用户显式开启；按新默认迁移为 false，
      // 否则老用户升级后右侧预览仍然显示。与 settingsStore.loadSettingsFromStorage 保持一致。
      // 用 PREVIEW_MODE_OFF_VERSION（v2）判断，不随 SETTINGS_VERSION 升到 v3 而变化。
      const version = (s && typeof s.settingsVersion === 'number') ? s.settingsVersion : 1
      preview = s?.previewModeEnabled === true && version >= PREVIEW_MODE_OFF_VERSION
    }
  } catch {}
  return { showOutline: false, showPreview: preview, showLibrary: false, statusbarCollapsed: false }
}

function saveLayoutState(partial: Partial<ReturnType<typeof loadLayoutState>>): void {
  try { localStorage.setItem('lzeditor-layout', JSON.stringify({ ...loadLayoutState(), ...partial })) } catch {}
}

const initialLayout = loadLayoutState()

// 欢迎页标记放在 sessionStorage：只在「首次打开」时出现，同一会话内刷新不会重复弹窗。
const WELCOME_SEEN_KEY = 'lzeditor-welcome-seen'
let welcomeSeen = false
try { welcomeSeen = sessionStorage.getItem(WELCOME_SEEN_KEY) === '1' } catch {}

// 任何「用户主动新建/切换文档」都意味着欢迎页该让位
let silentSwitchDoc = false
export function switchDocSilently(fn: () => void): void {
  silentSwitchDoc = true
  try { fn() } finally { silentSwitchDoc = false }
}

function markWelcomeSeen(set: (partial: any) => void): void {
  set({ showWelcome: false })
  try { sessionStorage.setItem(WELCOME_SEEN_KEY, '1') } catch {}
}

/**
 * 出厂文档列表。全部打 builtin 标记，让 persistCatalog 能整批丢掉。
 *
 * readme 故意不带 system——LibraryTree 靠 `node.system || node.id === 'readme'`
 * 给 readme 显示「还原出厂内容」，DocumentMetaBar / LibraryPanel 也把
 * `!system` 当用户文档计数。别在这里替它补上 system。
 */
const DEFAULT_DOCS: Array<CatalogEntry> = ([
  { id: 'readme',                   title: 'README.md',            path: 'Default',         libraryId: 'default' },
] as Array<CatalogEntry>).map(d => ({ ...d, builtin: true }))

/** 启动时从 localStorage 恢复文档库；没有存档就回落到出厂列表。 */
const restored = restoreSession(DEFAULT_DOCS, 'readme')

/**
 * 把当前目录写回 localStorage。
 *
 * 只在会改目录的动作里调用：createDoc / closeDoc / createLibrary / renameLibrary。
 * switchDoc 不加——它会覆盖 activeDocId 的持久化，而「记住上次打开的文档」
 * 由 switchDoc 里已有的 lzeditor-last-doc 负责，两层记录会互相打架。
 */
function saveCatalog(): void {
  const s = useEditorStore.getState() as any
  persistCatalog({
    docs: (s.docs || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      path: d.path || '',
      libraryId: d.libraryId,
      diskPath: d.diskPath,
      system: d.system,
      builtin: d.builtin,
    })),
    docLibraries: s.docLibraries as Array<{ id: string; name: string }>,
    nextUntitledIdx: s.nextUntitledIdx,
    activeDocId: s.activeDocId || 'readme',
  })
}

export const useEditorStore = create<EditorStoreState>((set: any, get: any) => ({
  docTitle: DEFAULT_DOC_TITLE,
  docPath: '',
  docHTML: '',
  wordCount: 0,
  charCount: 0,
  cursorPosition: { line: 1, column: 1 },
  isPreview: false,
  syncStatus: 'synced',
  openPanel: 'none',
  insertPanel: 'none' as const,
  panelOpen: false,
  showOutline: initialLayout.showOutline,
  showPreview: initialLayout.showPreview,
  showLibrary: initialLayout.showLibrary,
  showRightPanel: false,
  statusbarCollapsed: initialLayout.statusbarCollapsed,
  showSearch: false,
  codeMode: false,
  codeModeCursor: 0,
  appMode: 'edit' as const,
  docLibraries: restored.docLibraries,
  activeLibraryId: 'default',
  previewMode: 'render' as 'render' | 'code',
  previewWidth: 400,
  mdContent: '',
  readLayout: 'normal' as const,
  readTocOpen: true as const,
  readFontSize: 18,
  tocItems: [] as { id: string; text: string; level: number }[],
  activeTocId: '' as string,
  editorRef: null,
  editorContentRef: null,
  versionsByDoc: {} as Record<string, DocVersion[]>,
  lastEditTime: Date.now(),
  showWelcome: !welcomeSeen,

  // ── Multi-tab ──
  docs: restored.docs as Array<{ id: string; title: string; path: string; libraryId?: string; diskPath?: string; system?: boolean; builtin?: boolean }>,
  activeDocId: restored.activeDocId as string | null,
  docsMd: {} as Record<string, string>,
  nextUntitledIdx: restored.nextUntitledIdx,

  setTitle: (title: string) => set({ docTitle: title }),
  setWordCount: (count: number) => set({ wordCount: count }),
  setCharCount: (count: number) => set({ charCount: count }),
  setCursorPosition: (pos: { line: number; column: number }) => set({ cursorPosition: pos }),
  setDocHTML: (html: string) => set({ docHTML: html }),
  setPreview: (isPreview: boolean) => set({ isPreview }),
  setSyncStatus: (status: 'synced' | 'saving' | 'error') => set({ syncStatus: status }),
  setOpenPanel: (panel: EditorStoreState['openPanel']) => {
    const isOpening = panel !== 'none'
    if (isOpening) {
      const pm = get().editorContentRef
      if (document.activeElement === pm) {
        try { pm.blur() } catch {}
      }
    }
    set({ openPanel: panel, panelOpen: isOpening })
  },
  setInsertPanel: (panel: EditorStoreState['insertPanel']) => {
    if (panel !== 'none') {
      const pm = get().editorContentRef
      if (document.activeElement === pm) {
        try { pm.blur() } catch {}
      }
    }
    set({ insertPanel: panel, panelOpen: panel !== 'none' })
  },
  setShowOutline: (showOutline: boolean) => {
    set({ showOutline })
    saveLayoutState({ showOutline })
  },
  setShowPreview: (showPreview: boolean) => {
    set({ showPreview })
    saveLayoutState({ showPreview })
  },
  setShowSearch: (showSearch: boolean) => set({ showSearch }),
  setShowRightPanel: (showRightPanel: boolean) => set({ showRightPanel }),
  setShowLibrary: (showLibrary: boolean) => {
    set({ showLibrary })
    saveLayoutState({ showLibrary })
  },
  setStatusbarCollapsed: (statusbarCollapsed: boolean) => {
    set({ statusbarCollapsed })
    saveLayoutState({ statusbarCollapsed })
  },
  setCodeMode: (codeMode: boolean) => set({ codeMode }),
  setAppMode: (appMode: 'edit' | 'code' | 'style' | 'history' | 'read') => set({ appMode }),
  createLibrary: (name: string) => {
    const title = (name || '').trim() || `Library ${get().docLibraries.length + 1}`
    const id = `lib-${Date.now()}`
    set((s: any) => ({
      docLibraries: [...s.docLibraries, { id, name: title }],
      activeLibraryId: id,
      showLibrary: true,
    }))
    saveCatalog()
    return id
  },
  setActiveLibrary: (id: string) => set({ activeLibraryId: id }),
  renameLibrary: (id: string, name: string) => {
    set((s: any) => ({
      docLibraries: s.docLibraries.map((lib: any) => lib.id === id ? { ...lib, name } : lib),
    }))
    saveCatalog()
  },
  setPreviewMode: (previewMode: 'render' | 'code') => set({ previewMode }),
  togglePreviewMode: () => set((s: any) => ({ previewMode: s.previewMode === 'code' ? 'render' : 'code' })),
  setPreviewWidth: (previewWidth: number) => set({ previewWidth }),
  setMdContent: (mdContent: string) => set({ mdContent }),
  setReadLayout: (readLayout: 'narrow' | 'normal' | 'wide') => set({ readLayout }),
  setReadTocOpen: (readTocOpen: boolean) => set({ readTocOpen }),
  setTocItems: (tocItems: { id: string; text: string; level: number }[]) => set({ tocItems }),
  setActiveTocId: (activeTocId: string) => set({ activeTocId }),
  setReadFontSize: (readFontSize: number) => set({ readFontSize }),
  setEditorRef: (ref: HTMLDivElement | null) => set({ editorRef: ref }),
  setEditorContentRef: (ref: HTMLDivElement | null) => set({ editorContentRef: ref }),
  setLastEditTime: (time: number) => set({ lastEditTime: time }),
  setShowWelcome: (showWelcome: boolean) => {
    if (showWelcome) set({ showWelcome: true })
    else markWelcomeSeen(set)
  },
  addVersion: (docId: string, version: DocVersion) => {
    const byDoc = get().versionsByDoc || {}
    // 未播种时以磁盘为准：回滚/重播后第一次编辑不覆盖既有快照
    const base = byDoc[docId] ?? loadVersions(docId)
    const last = base[base.length - 1]
    // 以 markdown 正文比较：旧编辑器曾长期传 html:''，按 html 去重会丢掉所有后续快照
    if (last && last.md === version.md) return
    const next = [...base, version].slice(-MAX_VERSIONS)
    set({ versionsByDoc: { ...byDoc, [docId]: next } })
    saveVersions(docId, next)
  },
  hydrateVersions: (docId: string) => {
    const byDoc = get().versionsByDoc || {}
    if (byDoc[docId]) return
    set({ versionsByDoc: { ...byDoc, [docId]: loadVersions(docId) } })
  },

  // ── Tab actions ──
  createDoc: (title?: string, path = '', libraryId?: string, diskPath?: string) => {
    const { docs, nextUntitledIdx: idx, activeLibraryId, docLibraries } = get()
    const targetLibraryId = libraryId || activeLibraryId || 'default'
    const library = docLibraries.find((lib: any) => lib.id === targetLibraryId) || docLibraries[0]
    const name = title || `Untitled-${idx}.md`
    const id = String(Date.now())
    const newDoc = { id, title: name, path: path || library?.name || 'Default', libraryId: targetLibraryId, diskPath }
    set({
      docs: [...docs, newDoc],
      activeDocId: id,
      docTitle: name,
      docPath: newDoc.path,
      activeLibraryId: targetLibraryId,
      lastEditTime: Date.now(),
      nextUntitledIdx: idx + 1,
    })
    markWelcomeSeen(set)
    saveCatalog()
    return id
  },
   switchDoc: (id: string) => {
    if (!silentSwitchDoc) markWelcomeSeen(set)
    const s = get()
    const doc = s.docs.find((d: any) => d.id === id)
    if (!doc) return
    if (id === s.activeDocId) {
      set({ docTitle: doc.title, docPath: doc.path || '', activeLibraryId: doc.libraryId || s.activeLibraryId })
      return
    }
    // 切换前把未落盘的编辑写回当前文档。编辑器已在 onChange 里写 docsMd，
    // 这里只兜底 mdContent（代码模式编辑走的是 mdContent）；
    // 不能再读 s.editor?.getHTML() —— 那是旧编辑器的历史内容，会把新编辑覆盖掉。
    if (s.activeDocId && s.mdContent && s.mdContent !== s.docsMd?.[s.activeDocId]) {
      s.updateDoc({ docsMd: { [s.activeDocId]: s.mdContent } })
    }
    set({
      activeDocId: id,
      docTitle: doc.title,
      docPath: doc.path || '',
      activeLibraryId: doc.libraryId || s.activeLibraryId,
      lastEditTime: Date.now(),
    })
    try { localStorage.setItem('lzeditor-last-doc', id) } catch {}
  },
   closeDoc: (id: string) => {
    const { docs, activeDocId } = get()
    const idx = docs.findIndex((d: any) => d.id === id)
    if (idx === -1) return
    const nextDocs = docs.filter((d: any) => d.id !== id)
    let nextActiveId = activeDocId
    if (activeDocId === id) {
      nextActiveId = nextDocs[Math.min(idx, nextDocs.length - 1)]?.id ?? null
    }
    const nextDoc = nextDocs.find((d: any) => d.id === nextActiveId)
    set({
      docs: nextDocs,
      activeDocId: nextActiveId,
      ...(nextDoc ? { docTitle: nextDoc.title, docPath: nextDoc.path || '', activeLibraryId: nextDoc.libraryId || get().activeLibraryId } : {}),
    })
    saveCatalog()
  },
  resetDocContent: (id: string) => {
    // 清掉本地覆盖，内置文档就自动回到出厂内容
    try { localStorage.removeItem('lzeditor-doc-' + id) } catch {}
    const s = get()
    const next = { ...(s.docsMd || {}) }
    delete next[id]
    const md = getDocMd(id)
    set({ docsMd: next, ...(s.activeDocId === id ? { mdContent: md } : {}) })
    if (s.activeDocId === id) getEditorFacade()?.setText(md)
  },
  setDocsMd: (mds: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => set((s: any) => ({
    docsMd: typeof mds === 'function' ? mds(s.docsMd || {}) : mds,
  })),
  updateDoc: (params: { md?: string; html?: string; docsMd?: Record<string, string> }) => set((s: any) => {
    const next: Record<string, any> = {}
    if (params.md !== undefined) next.mdContent = params.md
    if (params.html !== undefined) next.docHTML = params.html
    // docsMd 是逐文档合并：整体替换会丢掉其它文档已编辑的内容
    if (params.docsMd !== undefined) next.docsMd = { ...(s.docsMd || {}), ...params.docsMd }
    return next
  }),
}))
