import { create } from 'zustand'
import type { AIStoreState, AIAction, ApplyRecord, ChatMessage } from '../shared/types'

export const useAIStore = create<AIStoreState>((set, get) => ({
  docTitle: 'untitled.md',
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
  readProgress: 0,
  fontSize: 17,
  editorRef: null,
  setEditorRef: (ref: HTMLDivElement | null) => set({ editorRef: ref }),
  setTitle: (title: string) => set({ docTitle: title }),
  setWordCount: (count: number) => set({ wordCount: count }),
  setCharCount: (count: number) => set({ charCount: count }),
  setDocHTML: (html: string) => set({ docHTML: html }),
  setCursorPosition: (pos: { line: number; column: number }) => set({ cursorPosition: pos }),
  setPreview: (isPreview: boolean) => set({ isPreview }),
  setReadMode: (isReadMode: boolean) => set({ isReadMode }),
  setSyncStatus: (status: 'synced' | 'saving' | 'error') => set({ syncStatus: status }),
  setOpenPanel: (panel: 'none' | 'library' | 'file' | 'outline' | 'preview' | 'image' | 'link' | 'code' | 'table' | 'history' | 'settings' | 'export') => set({ openPanel: panel }),
  setShowOutline: (showOutline: boolean) => set({ showOutline }),
  setShowPreview: (showPreview: boolean) => set({ showPreview }),
  setPreviewWidth: (previewWidth: number) => set({ previewWidth }),
  setReadProgress: (readProgress: number) => set({ readProgress }),
  setFontSize: (fontSize: number) => set({ fontSize }),

  panelVisible: false,
  panelAction: null,
  panelSelectedText: '',
  panelPosition: null,
  panelStatus: 'idle',
  panelInput: '',
  panelOutput: '',
  panelError: null,
  conversationMessages: [],
  lastSelection: null,
  applyHistory: [],

  showPanel: (action: AIAction, selectedText: string, position: { x: number; y: number }) =>
    set({
      panelVisible: true,
      panelAction: action,
      panelSelectedText: selectedText,
      panelPosition: position,
      panelStatus: 'idle',
      panelInput: '',
      panelOutput: '',
      panelError: null,
      conversationMessages: [],
    }),

  hidePanel: () =>
    set({
      panelVisible: false,
      panelStatus: 'idle',
      panelInput: '',
      panelOutput: '',
      panelError: null,
    }),

  setPanelInput: (input: string) => set({ panelInput: input }),
  setPanelStatus: (status: AIStoreState['panelStatus']) => set({ panelStatus: status }),
  setPanelOutput: (output: string) => set({ panelOutput: output }),
  setPanelError: (error: string | null) => set({ panelError: error }),

  appendConversation: (message: ChatMessage) =>
    set((state: AIStoreState) => ({
      conversationMessages: [...state.conversationMessages, message],
    })),

  recordApply: (record: Omit<ApplyRecord, 'id' | 'timestamp'>) =>
    set((state: AIStoreState) => ({
      applyHistory: [
        {
          ...record,
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          timestamp: Date.now(),
        },
        ...state.applyHistory.slice(0, 49),
      ],
    })),

  undoLastApply: () =>
    set((state: AIStoreState) => ({
      applyHistory: state.applyHistory.slice(1),
    })),

  getUndoRecord: (): ApplyRecord | null => get().applyHistory[0] || null,
}))
