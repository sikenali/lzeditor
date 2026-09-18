import { create } from 'zustand'
import type { EditorStoreState, DocVersion } from '../shared/types'

const MAX_VERSIONS = 30

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
  showOutline: false,
  showPreview: false,
  previewMode: 'render' as 'render' | 'code',
  previewWidth: 400,
  mdContent: '',
  readProgress: 0,
  fontSize: 17,
  editorRef: null,
  editorContentRef: null,
  editor: null,
  versions: [],
  lastEditTime: Date.now(),

  // ── Multi-tab ──
  docs: [] as Array<{ id: string; title: string; path: string }>,
  activeDocId: null as string | null,
  docsMd: {} as Record<string, string>,
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
  setShowOutline: (showOutline: boolean) => set({ showOutline }),
  setShowPreview: (showPreview: boolean) => set({ showPreview }),
  setPreviewMode: (previewMode: 'render' | 'code') => set({ previewMode }),
  setPreviewWidth: (previewWidth: number) => set({ previewWidth }),
  setMdContent: (mdContent: string) => set({ mdContent }),
  setReadProgress: (readProgress: number) => set({ readProgress }),
  setFontSize: (fontSize: number) => set({ fontSize }),
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
  createDoc: (title?: string, path = '') => {
    const { docs, nextUntitledIdx: idx } = get()
    const name = title || `Untitled-${idx}.md`
    const id = String(Date.now())
    const newDoc = { id, title: name, path }
    set({
      docs: [...docs, newDoc],
      activeDocId: id,
      docTitle: name,
      docPath: path,
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
  setDocsMd: (mds: Record<string, string>) => set({ docsMd: mds }),
}))
