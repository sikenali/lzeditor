import { create } from 'zustand'
import type { AIStoreState, AIAction, ApplyRecord, ChatMessage } from '../shared/types'

export const useAIStore = create<AIStoreState>((set, get) => ({
  // AI Panel state
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
