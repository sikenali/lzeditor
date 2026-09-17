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
  previewWidth: 400,
  mdContent: '',
  readProgress: 0,
  fontSize: 17,
  editorRef: null,
  editor: null,
  versions: [],

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
  setPreviewWidth: (previewWidth: number) => set({ previewWidth }),
  setMdContent: (mdContent: string) => set({ mdContent }),
  setReadProgress: (readProgress: number) => set({ readProgress }),
  setFontSize: (fontSize: number) => set({ fontSize }),
  setEditorRef: (ref: HTMLDivElement | null) => set({ editorRef: ref }),
  setEditor: (editor: any) => set({ editor }),
  addVersion: (version: DocVersion) => {
    const versions = get().versions
    // Skip if content unchanged vs latest snapshot
    if (versions.length > 0 && versions[versions.length - 1].html === version.html) return
    set({ versions: [...versions, version].slice(-MAX_VERSIONS) })
  },
  clearVersions: () => set({ versions: [] }),
}))
