export interface AIModel {
  id: string
  name: string
  maxTokens: number
  supportsStreaming: boolean
}

export interface AIProviderDef {
  id: string
  name: string
  defaultModel: string
  models: AIModel[]
  baseUrl: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIRequestOptions {
  provider: string
  model: string
  temperature: number
  maxTokens: number
  customBaseUrl?: string
}

export type AIAction = 'rewrite' | 'polish' | 'continue' | 'summarize' | 'translate' | 'question' | null

export interface ApplyRecord {
  id: string
  timestamp: number
  action: AIAction
  originalText: string
  newText: string
  position: { from: number; to: number }
}

export interface EditorStoreState {
  docTitle: string
  docPath: string
  docHTML: string
  wordCount: number
  charCount: number
  cursorPosition: { line: number; column: number }
  isPreview: boolean
  isReadMode: boolean
  syncStatus: 'synced' | 'saving' | 'error'
  openPanel: 'none' | 'library' | 'file' | 'outline' | 'preview' | 'image' | 'link' | 'code' | 'table' | 'history' | 'settings' | 'export'
  showOutline: boolean
  showPreview: boolean
  readProgress: number
  fontSize: number
  setTitle: (title: string) => void
  setWordCount: (count: number) => void
  setCharCount: (count: number) => void
  setCursorPosition: (pos: { line: number; column: number }) => void
  setDocHTML: (html: string) => void
  setPreview: (isPreview: boolean) => void
  setReadMode: (isReadMode: boolean) => void
  setSyncStatus: (status: 'synced' | 'saving' | 'error') => void
  setOpenPanel: (panel: 'none' | 'library' | 'file' | 'outline' | 'preview' | 'image' | 'link' | 'code' | 'table' | 'history' | 'settings' | 'export') => void
  setShowOutline: (showOutline: boolean) => void
  setShowPreview: (showPreview: boolean) => void
  setReadProgress: (progress: number) => void
  setFontSize: (fontSize: number) => void
  setEditorRef: (ref: HTMLDivElement | null) => void
  editorRef: HTMLDivElement | null
}

export type SettingsGroup = 'general' | 'editor' | 'appearance' | 'ai' | 'shortcut' | 'export' | 'sync' | 'advanced' | 'about'

export interface SettingsState {
  provider: string
  model: string
  apiKey: string
  customBaseUrl: string
  temperature: number
  maxTokens: number
  theme: 'dark' | 'light' | 'system'
  accentColor: string
  shortcut: string
  activeGroup: SettingsGroup
  fontSize?: number
  lineHeight?: number
  contentWidth?: number
  exportFormat?: string
  styleSet?: string
  includeTOC?: boolean
  includeLineNumbers?: boolean
  syncProvider?: string
  backupInterval?: string
  backupKeep?: number
  devTools?: boolean
  hardwareAccel?: boolean
  logLevel?: string
  editorFont?: string
  showMarkdownMarkers?: boolean
  showDiffHighlight?: boolean
  typewriterMode?: boolean
  focusMode?: boolean
}

export interface ThemeState {
  mode: 'dark' | 'light' | 'system'
  accentColor: string
}

export interface AIStoreState extends EditorStoreState {
  panelVisible: boolean
  panelAction: AIAction
  panelSelectedText: string
  panelPosition: { x: number; y: number } | null
  panelStatus: 'idle' | 'thinking' | 'result' | 'error' | 'applied'
  panelInput: string
  panelOutput: string
  panelError: string | null
  conversationMessages: ChatMessage[]
  lastSelection: { text: string; from: number; to: number } | null
  applyHistory: ApplyRecord[]
  showPanel: (action: AIAction, selectedText: string, position: { x: number; y: number }) => void
  hidePanel: () => void
  setPanelInput: (input: string) => void
  setPanelStatus: (status: 'idle' | 'thinking' | 'result' | 'error' | 'applied') => void
  setPanelOutput: (output: string) => void
  setPanelError: (error: string | null) => void
  appendConversation: (message: ChatMessage) => void
  recordApply: (record: Omit<ApplyRecord, 'id' | 'timestamp'>) => void
  undoLastApply: () => void
  getUndoRecord: () => ApplyRecord | null
}
