import { create } from 'zustand'
import type { AIStoreState, AIMode, ApplyRecord, ChatEntry } from '../shared/types'

export const useAIStore = create<AIStoreState>((set, get) => ({
  // AI Panel state
  panelVisible: false,
  panelSelectedText: '',
  panelPosition: null,
  panelStatus: 'idle',
  panelInput: '',
  lastSelection: null,
  applyHistory: [],
  // Chat-style AI panel state
  mode: 'write',
  messages: [],

  // 打开面板：保留对话历史，仅重置本次输入与状态。
  showPanel: (mode: AIMode, selectedText: string, position: { x: number; y: number }) =>
    set({
      panelVisible: true,
      mode,
      panelSelectedText: selectedText,
      panelPosition: position,
      panelStatus: 'idle',
      panelInput: '',
    }),

  hidePanel: () =>
    set({
      panelVisible: false,
      panelStatus: 'idle',
      panelInput: '',
    }),

  setPanelInput: (input: string) => set({ panelInput: input }),
  setPanelStatus: (status: AIStoreState['panelStatus']) => set({ panelStatus: status }),

  setMode: (mode: AIMode) => set({ mode }),
  setSelectedText: (text: string) => set({ panelSelectedText: text }),
  addMessage: (message: ChatEntry) =>
    set((state: AIStoreState) => ({ messages: [...state.messages, message] })),
  updateMessage: (id: string, patch: Partial<ChatEntry>) =>
    set((state: AIStoreState) => ({
      messages: state.messages.map(x => (x.id === id ? { ...x, ...patch } : x)),
    })),
  appendStreamToMessage: (id: string, delta: string) =>
    set((state: AIStoreState) => ({
      messages: state.messages.map(x => (x.id === id ? { ...x, content: x.content + delta } : x)),
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
