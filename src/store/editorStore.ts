import { create } from 'zustand'
import type { EditorStoreState, DocVersion } from '../shared/types'

const MAX_VERSIONS = 10

export const useEditorStore = create<EditorStoreState>((set: any, get: any) => ({
  docTitle: 'Welcome to LZEditor',
  docPath: '',
  docHTML: '',
  wordCount: 0,
  charCount: 0,
  cursorPosition: { line: 1, column: 1 },
  isPreview: false,
  isReadMode: false,
  syncStatus: 'synced',
  openPanel: 'none',
  insertPanel: 'none' as const,
  showOutline: false,
  showPreview: false,
  showLibrary: true,
  codeMode: false,
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
  editorRef: null,
  editorContentRef: null,
  editor: null,
  versions: [],
  lastEditTime: Date.now(),

  // ── Multi-tab ──
  docs: [{ id: 'welcome', title: 'Welcome to LZEditor.md', path: 'Default', libraryId: 'default' }] as Array<{ id: string; title: string; path: string; libraryId?: string }>,
  activeDocId: 'welcome' as string | null,
  docsMd: (() => {
    const result: Record<string, string> = {}
    try {
      // Try new key format first (lzeditor-doc-{id})
      const s1 = localStorage.getItem('lzeditor-doc-welcome')
      if (s1) {
        const d = JSON.parse(s1)
        if (d.md) result['welcome'] = d.md
      }
      // Fallback: old key format (lzeditor-doc)
      if (!result['welcome']) {
        const s2 = localStorage.getItem('lzeditor-doc')
        if (s2) {
          const d = JSON.parse(s2)
          if (d.md) result['welcome'] = d.md
        }
      }
    } catch {}
    return result
  })(),
  nextUntitledIdx: 1,

  setTitle: (title: string) => set({ docTitle: title }),
  setDocPath: (path: string) => set({ docPath: path }),
  setWordCount: (count: number) => set({ wordCount: count }),
  setCharCount: (count: number) => set({ charCount: count }),
  setCursorPosition: (pos: { line: number; column: number }) => set({ cursorPosition: pos }),
  setDocHTML: (html: string) => set({ docHTML: html }),
  setPreview: (isPreview: boolean) => set({ isPreview }),
  setReadMode: (isReadMode: boolean) => set({ isReadMode }),
  setSyncStatus: (status: 'synced' | 'saving' | 'error') => set({ syncStatus: status }),
  setOpenPanel: (panel: EditorStoreState['openPanel']) => set({ openPanel: panel }),
  setInsertPanel: (panel: EditorStoreState['insertPanel']) => set({ insertPanel: panel }),
  setShowOutline: (showOutline: boolean) => set({ showOutline }),
  setShowPreview: (showPreview: boolean) => set({ showPreview }),
  setShowLibrary: (showLibrary: boolean) => set({ showLibrary }),
  setCodeMode: (codeMode: boolean) => set({ codeMode }),
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
  setPreviewMode: (previewMode: 'render' | 'code') => set({ previewMode }),
  setPreviewWidth: (previewWidth: number) => set({ previewWidth }),
  setMdContent: (mdContent: string) => set({ mdContent }),
  setReadProgress: (readProgress: number) => set({ readProgress }),
  setFontSize: (fontSize: number) => set({ fontSize }),
  setReadLayout: (readLayout: 'narrow' | 'normal' | 'wide') => set({ readLayout }),
  setReadZoom: (readZoom: number) => set({ readZoom }),
  setReadTocOpen: (readTocOpen: boolean) => set({ readTocOpen }),
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
}))
