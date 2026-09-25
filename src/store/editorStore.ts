import { create } from 'zustand'
import type { EditorStoreState, DocVersion } from '../shared/types'
import { DEFAULT_DOC_TITLE } from '../components/editor/constants'
import { BUILTIN_DOCS } from '../utils/docSource'

const MAX_VERSIONS = 10

/** Load persisted layout state from localStorage. */
function loadLayoutState(): { showOutline: boolean; showPreview: boolean; showLibrary: boolean } {
  try {
    const raw = localStorage.getItem('lzeditor-layout')
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        showOutline: typeof parsed.showOutline === 'boolean' ? parsed.showOutline : false,
        showPreview: typeof parsed.showPreview === 'boolean' ? parsed.showPreview : false,
        showLibrary: typeof parsed.showLibrary === 'boolean' ? parsed.showLibrary : false,
      }
    }
  } catch {}
  return { showOutline: false, showPreview: false, showLibrary: false }
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
  showSearch: false,
  codeMode: false,
  codeModeCursor: 0,
  appMode: 'edit' as const,
  docLibraries: [{ id: 'default', name: 'Default' }],
  activeLibraryId: 'default',
  previewMode: 'render' as 'render' | 'code',
  previewWidth: 400,
  mdContent: '',
  readProgress: 0,
  fontSize: 17,
  readLayout: 'normal' as const,
  readZoom: 100,
  readTocOpen: true as const,
  readFontSize: 18,
  tocItems: [] as { id: string; text: string; level: number }[],
  activeTocId: '' as string,
  editorRef: null,
  editorContentRef: null,
  editor: null,
  versions: [],
  lastEditTime: Date.now(),

  // ── Multi-tab ──
  docs: [
    { id: 'welcome',      title: '欢迎文档',     path: 'Default',       libraryId: 'default' },
    { id: 'a01-特色功能',  title: 'A01 特色功能', path: '使用手册',      libraryId: 'manual' },
    { id: 'a02-文档库和文档', title: 'A02 文档库和文档', path: '使用手册', libraryId: 'manual' },
    { id: 'a03-基本格式',  title: 'A03 基本格式', path: '使用手册',      libraryId: 'manual' },
    { id: 'a04-自动完成',  title: 'A04 自动完成', path: '使用手册',      libraryId: 'manual' },
    { id: 'a05-快捷键',    title: 'A05 快捷键',   path: '使用手册',      libraryId: 'manual' },
    { id: 'a06-大纲视图',  title: 'A06 大纲视图', path: '使用手册',      libraryId: 'manual' },
    { id: 'a07-即时预览和阅读模式', title: 'A07 即时预览与阅读模式', path: '使用手册', libraryId: 'manual' },
    { id: 'a08-预览视图',  title: 'A08 预览视图', path: '使用手册',      libraryId: 'manual' },
    { id: 'a09-历史记录',  title: 'A09 历史记录', path: '使用手册',      libraryId: 'manual' },
    { id: 'a10-拼写检查',  title: 'A10 拼写检查', path: '使用手册',      libraryId: 'manual' },
  ] as Array<{ id: string; title: string; path: string; libraryId?: string }>,
  activeDocId: 'welcome' as string | null,
  docsMd: {} as Record<string, string>,
  nextUntitledIdx: 1,

  setTitle: (title: string) => set({ docTitle: title }),
  setDocPath: (path: string) => set({ docPath: path }),
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
  setPanelOpen: (open: boolean) => set({ panelOpen: open }),
  setShowOutline: (showOutline: boolean) => {
    set({ showOutline })
    try { localStorage.setItem('lzeditor-layout', JSON.stringify({ ...loadLayoutState(), showOutline })) } catch {}
  },
  setShowPreview: (showPreview: boolean) => {
    set({ showPreview })
    try { localStorage.setItem('lzeditor-layout', JSON.stringify({ ...loadLayoutState(), showPreview })) } catch {}
  },
  setShowSearch: (showSearch: boolean) => set({ showSearch }),
  setShowRightPanel: (showRightPanel: boolean) => set({ showRightPanel }),
  setShowLibrary: (showLibrary: boolean) => {
    set({ showLibrary })
    try { localStorage.setItem('lzeditor-layout', JSON.stringify({ ...loadLayoutState(), showLibrary })) } catch {}
  },
  setCodeMode: (codeMode: boolean) => set({ codeMode }),
  setCodeModeCursor: (codeModeCursor: number) => set({ codeModeCursor }),
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
  setReadProgress: (readProgress: number) => set({ readProgress }),
  setFontSize: (fontSize: number) => set({ fontSize }),
  setReadLayout: (readLayout: 'narrow' | 'normal' | 'wide') => set({ readLayout }),
  setReadZoom: (readZoom: number) => set({ readZoom }),
  setReadTocOpen: (readTocOpen: boolean) => set({ readTocOpen }),
  setTocItems: (tocItems: { id: string; text: string; level: number }[]) => set({ tocItems }),
  setActiveTocId: (activeTocId: string) => set({ activeTocId }),
  setReadFontSize: (readFontSize: number) => set({ readFontSize }),
  setEditorRef: (ref: HTMLDivElement | null) => set({ editorRef: ref }),
  setEditorContentRef: (ref: HTMLDivElement | null) => set({ editorContentRef: ref }),
  setEditor: (editor: any) => set({ editor }),
  setLastEditTime: (time: number) => set({ lastEditTime: time }),
  addVersion: (version: DocVersion) => {
    const versions = get().versions
    if (versions.length > 0 && versions[versions.length - 1].html === version.html) return
    set({ versions: [...versions, version].slice(-MAX_VERSIONS) })
  },
  clearVersions: () => set({ versions: [] }),
  setDocGitMeta: (meta: { gitPath?: string; isFromGit?: boolean }) => set((s: any) => ({
    docs: s.docs.map((d: any) => d.id === s.activeDocId ? { ...d, gitPath: meta.gitPath, isFromGit: meta.isFromGit } : d),
  })),

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
    return id
  },
  switchDoc: (id: string) => set({ activeDocId: id }),
  closeDoc: (id: string) => {
    const { docs, activeDocId } = get()
    const idx = docs.findIndex((d: any) => d.id === id)
    if (idx === -1) return
    const nextDocs = docs.filter((d: any) => d.id !== id)
    let nextActiveId = activeDocId
    if (activeDocId === id) {
      nextActiveId = nextDocs[Math.min(idx, nextDocs.length - 1)]?.id ?? null
    }
    set({ docs: nextDocs, activeDocId: nextActiveId })
  },
  renameDoc: (id: string, title: string) => {
    set((s: any) => ({
      docs: s.docs.map((d: any) => d.id === id ? { ...d, title } : d),
      ...(s.activeDocId === id ? { docTitle: title } : {}),
    }))
  },
  setDocsMd: (mds: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => set((s: any) => ({
    docsMd: typeof mds === 'function' ? mds(s.docsMd || {}) : mds,
  })),
  updateDoc: (params: { md?: string; html?: string; docsMd?: Record<string, string> }) => set((s: any) => {
    const next: Record<string, any> = {}
    if (params.md !== undefined) next.mdContent = params.md
    if (params.html !== undefined) next.docHTML = params.html
    if (params.docsMd !== undefined) next.docsMd = params.docsMd
    return next
  }),
}))
