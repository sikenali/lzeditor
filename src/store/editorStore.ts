import { create } from 'zustand'
import type { EditorStoreState, DocVersion } from '../shared/types'
import { DEFAULT_DOC_TITLE } from '../components/editor/constants'
import { getDocMd } from '../utils/docSource'
import { getCM6Editor } from '../components/editor/codemirror/registry'

const MAX_VERSIONS = 10

/** Load persisted layout state from localStorage. */
function loadLayoutState(): { showOutline: boolean; showPreview: boolean; showLibrary: boolean; statusbarCollapsed: boolean } {
  try {
    const raw = localStorage.getItem('lzeditor-layout')
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        showOutline: typeof parsed.showOutline === 'boolean' ? parsed.showOutline : false,
        showPreview: typeof parsed.showPreview === 'boolean' ? parsed.showPreview : false,
        showLibrary: typeof parsed.showLibrary === 'boolean' ? parsed.showLibrary : false,
        statusbarCollapsed: typeof parsed.statusbarCollapsed === 'boolean' ? parsed.statusbarCollapsed : false,
      }
    }
  } catch {}
  return { showOutline: false, showPreview: false, showLibrary: false, statusbarCollapsed: false }
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
  showOutline: false,
  showPreview: false,
  showLibrary: false,
  showRightPanel: false,
  statusbarCollapsed: initialLayout.statusbarCollapsed,
  showSearch: false,
  codeMode: false,
  codeModeCursor: 0,
  appMode: 'edit' as const,
  docLibraries: [{ id: 'default', name: 'Default' }],
  activeLibraryId: 'default',
  previewMode: 'render' as 'render' | 'code',
  previewWidth: 400,
  mdContent: '',
  fontSize: 17,
  readLayout: 'normal' as const,
  readTocOpen: true as const,
  readFontSize: 18,
  tocItems: [] as { id: string; text: string; level: number }[],
  activeTocId: '' as string,
  editorRef: null,
  editorContentRef: null,
  versions: [],
  lastEditTime: Date.now(),
  showWelcome: !welcomeSeen,

  // ── Multi-tab ──
  docs: [
    { id: 'readme',                   title: 'README.md',        path: 'Default',        libraryId: 'default' },
    { id: 'a01-特色功能',           title: 'A01 特色功能',   path: '使用手册·基础篇', libraryId: 'manual', system: true },
    { id: 'a02-文档库和文档',       title: 'A02 文档库和文档', path: '使用手册·基础篇', libraryId: 'manual', system: true },
    { id: 'a03-基本格式',           title: 'A03 基本格式',   path: '使用手册·基础篇', libraryId: 'manual', system: true },
    { id: 'a04-自动完成',           title: 'A04 自动完成',   path: '使用手册·基础篇', libraryId: 'manual', system: true },
    { id: 'a05-快捷键',             title: 'A05 快捷键',     path: '使用手册·基础篇', libraryId: 'manual', system: true },
    { id: 'a06-大纲视图',           title: 'A06 大纲视图',   path: '使用手册·基础篇', libraryId: 'manual', system: true },
    { id: 'a07-即时预览和阅读模式', title: 'A07 即时预览与阅读模式', path: '使用手册·基础篇', libraryId: 'manual', system: true },
    { id: 'a08-预览视图',           title: 'A08 预览视图',   path: '使用手册·基础篇', libraryId: 'manual', system: true },
    { id: 'a09-历史记录',           title: 'A09 历史记录',   path: '使用手册·基础篇', libraryId: 'manual', system: true },
    { id: 'a10-拼写检查',           title: 'A10 拼写检查',   path: '使用手册·基础篇', libraryId: 'manual', system: true },
    { id: 'b01-链接',               title: 'B01 链接',       path: '使用手册·高级篇', libraryId: 'manual', system: true },
    { id: 'b02-图像',               title: 'B02 图像',       path: '使用手册·高级篇', libraryId: 'manual', system: true },
    { id: 'b03-脚注',               title: 'B03 脚注',       path: '使用手册·高级篇', libraryId: 'manual', system: true },
    { id: 'b04-任务列表',           title: 'B04 任务列表',   path: '使用手册·高级篇', libraryId: 'manual', system: true },
    { id: 'b05-表格',               title: 'B05 表格',       path: '使用手册·高级篇', libraryId: 'manual', system: true },
    { id: 'b06-图表',               title: 'B06 图表',       path: '使用手册·高级篇', libraryId: 'manual', system: true },
    { id: 'b07-代码块',             title: 'B07 代码块',     path: '使用手册·高级篇', libraryId: 'manual', system: true },
    { id: 'b08-html代码',           title: 'B08 HTML 代码',  path: '使用手册·高级篇', libraryId: 'manual', system: true },
    { id: 'b09-LaTeX数学公式',      title: 'B09 LaTeX 数学公式', path: '使用手册·高级篇', libraryId: 'manual', system: true },
    { id: 'b10-高级格式',           title: 'B10 高级格式',   path: '使用手册·高级篇', libraryId: 'manual', system: true },
  ] as Array<{ id: string; title: string; path: string; libraryId?: string; system?: boolean }>,
  activeDocId: 'readme' as string | null,
  docsMd: {} as Record<string, string>,
  nextUntitledIdx: 1,

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
    return id
  },
  setActiveLibrary: (id: string) => set({ activeLibraryId: id }),
  renameLibrary: (id: string, name: string) => set((s: any) => ({
    docLibraries: s.docLibraries.map((lib: any) => lib.id === id ? { ...lib, name } : lib),
  })),
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
  addVersion: (version: DocVersion) => {
    const versions = get().versions
    const last = versions[versions.length - 1]
    // 以 markdown 正文比较：CM6 曾长期传 html:''，按 html 去重会丢掉所有后续快照
    if (last && last.md === version.md) return
    set({ versions: [...versions, version].slice(-MAX_VERSIONS) })
  },

  // ── Tab actions ──
  createDoc: (title?: string, path = '', libraryId?: string) => {
    const { docs, nextUntitledIdx: idx, activeLibraryId, docLibraries } = get()
    const targetLibraryId = libraryId || activeLibraryId || 'default'
    const library = docLibraries.find((lib: any) => lib.id === targetLibraryId) || docLibraries[0]
    const name = title || `Untitled-${idx}.md`
    const id = String(Date.now())
    const newDoc = { id, title: name, path: path || library?.name || 'Default', libraryId: targetLibraryId }
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
    // 切换前把未落盘的编辑写回当前文档。CM6 已在 onChange 里写 docsMd，
    // 这里只兜底 mdContent（代码模式编辑走的是 mdContent）；
    // 不能再读 s.editor?.getHTML() —— 那是 TipTap 的旧内容，会把 CM6 的编辑覆盖掉。
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
  },
  resetDocContent: (id: string) => {
    // 清掉本地覆盖，内置文档就自动回到出厂内容
    try { localStorage.removeItem('lzeditor-doc-' + id) } catch {}
    const s = get()
    const next = { ...(s.docsMd || {}) }
    delete next[id]
    const md = getDocMd(id)
    set({ docsMd: next, ...(s.activeDocId === id ? { mdContent: md } : {}) })
    if (s.activeDocId === id) getCM6Editor()?.setText(md)
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
