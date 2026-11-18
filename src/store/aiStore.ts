import { create } from 'zustand'
import type { AIStoreState, AIAction, AIMode, ApplyRecord, ChatMessage, ChatEntry } from '../shared/types'
import { AI_MODE_ORDER } from '../shared/aiModes'

const isAIMode = (value: AIAction | AIMode): value is AIMode =>
  typeof value === 'string' && (AI_MODE_ORDER as string[]).includes(value)

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
  // Chat-style AI panel state
  mode: 'write',
  messages: [],

  showPanel: (modeOrAction: AIMode | AIAction, selectedText: string, position: { x: number; y: number }) => {
    if (isAIMode(modeOrAction)) {
      // 新模式入口：保留 messages，仅重置面板输入/状态。
      set({
        panelVisible: true,
        mode: modeOrAction,
        panelSelectedText: selectedText,
        panelPosition: position,
        panelStatus: 'idle',
        panelInput: '',
      })
      return
    }
    set({
      panelVisible: true,
      panelAction: modeOrAction,
      panelSelectedText: selectedText,
      panelPosition: position,
      panelStatus: 'idle',
      panelInput: '',
      panelOutput: '',
      panelError: null,
      conversationMessages: [],
    })
  },

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
