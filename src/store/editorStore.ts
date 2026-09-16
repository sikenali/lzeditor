import { create } from 'zustand'
import type { EditorStoreState } from '../shared/types'

export const useEditorStore = create<EditorStoreState>((set: any) => ({
  docTitle: 'untitled.md',
  docPath: '',
  wordCount: 0,
  charCount: 0,
  cursorPosition: { line: 1, column: 1 },
  isPreview: false,
  isReadMode: false,
  syncStatus: 'synced',
  openPanel: 'none',

  setTitle: (title: string) => set({ docTitle: title }),
  setWordCount: (count: number) => set({ wordCount: count }),
  setCharCount: (count: number) => set({ charCount: count }),
  setCursorPosition: (pos: { line: number; column: number }) => set({ cursorPosition: pos }),
  setPreview: (isPreview: boolean) => set({ isPreview }),
  setReadMode: (isReadMode: boolean) => set({ isReadMode }),
  setSyncStatus: (status: EditorStoreState['syncStatus']) => set({ syncStatus: status }),
  setOpenPanel: (panel: 'none' | 'styles' | 'history' | 'settings' | 'export') => set({ openPanel: panel }),
}))
