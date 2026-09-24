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

export interface ApiKeyEntry {
  id: string
  provider: string
  model: string
  modelName: string
  key: string
  enabled: boolean
  endpoint?: string
  format?: 'openai' | 'anthropic'
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

export interface GitDocMeta {
  gitPath?: string
  lastCommitHash?: string
  lastCommitTime?: string
  isFromGit?: boolean
  gitRepo?: string
}

export interface DocVersion {
  id: string
  time: string
  date: string
  desc: string
  changes: number
  html: string
  md: string
  gitPath?: string
  isFromGit?: boolean
}

export interface EditorStoreState {
  docTitle: string
  docPath: string
  docHTML: string
  wordCount: number
  charCount: number
  cursorPosition: { line: number; column: number }
  isPreview: boolean
  syncStatus: 'synced' | 'saving' | 'error'
  openPanel: 'none' | 'library' | 'file' | 'outline' | 'preview' | 'image' | 'link' | 'code' | 'table' | 'history' | 'settings' | 'export'
  insertPanel: 'none' | 'image' | 'link' | 'code' | 'formula' | 'table' | 'emoji' | 'chart'
  panelOpen: boolean
   showOutline: boolean
   showPreview: boolean
   showLibrary: boolean
   showRightPanel: boolean
   showSearch: boolean
  codeMode: boolean
  appMode: 'edit' | 'code' | 'style' | 'history' | 'read'
  codeModeCursor: number
  docLibraries: Array<{ id: string; name: string }>
  activeLibraryId: string
  previewWidth: number
  previewMode: 'render' | 'code'
  mdContent: string
  readProgress: number
  fontSize: number
  readLayout: 'narrow' | 'normal' | 'wide'
  readZoom: number
  readTocOpen: boolean
  versions: DocVersion[]
  editor: any
  setTitle: (title: string) => void
  setDocPath: (path: string) => void
  setWordCount: (count: number) => void
  setCharCount: (count: number) => void
  setCursorPosition: (pos: { line: number; column: number }) => void
  setDocHTML: (html: string) => void
  setPreview: (isPreview: boolean) => void
  setSyncStatus: (status: 'synced' | 'saving' | 'error') => void
  setOpenPanel: (panel: 'none' | 'library' | 'file' | 'outline' | 'preview' | 'image' | 'link' | 'code' | 'table' | 'history' | 'settings' | 'export') => void
  setInsertPanel: (panel: 'none' | 'image' | 'link' | 'code' | 'formula' | 'table' | 'emoji' | 'chart') => void
  setPanelOpen: (open: boolean) => void
   setShowOutline: (showOutline: boolean) => void
   setShowPreview: (showPreview: boolean) => void
   setShowLibrary: (showLibrary: boolean) => void
   setShowRightPanel: (showRightPanel: boolean) => void
   setShowSearch: (showSearch: boolean) => void
  setCodeMode: (codeMode: boolean) => void
  setAppMode: (mode: 'edit' | 'code' | 'style' | 'history' | 'read') => void
  setCodeModeCursor: (offset: number) => void
  createLibrary: (name: string) => string
  setActiveLibrary: (id: string) => void
  setPreviewWidth: (width: number) => void
  setPreviewMode: (previewMode: "render" | "code") => void
  setMdContent: (md: string) => void
  setReadProgress: (progress: number) => void
  setFontSize: (fontSize: number) => void
  setReadLayout: (layout: 'narrow' | 'normal' | 'wide') => void
  setReadZoom: (zoom: number) => void
  setReadTocOpen: (open: boolean) => void
  setEditorRef: (ref: HTMLDivElement | null) => void
  editorRef: HTMLDivElement | null
  editorContentRef: HTMLDivElement | null
  setEditor: (editor: any) => void
  addVersion: (version: DocVersion) => void
  clearVersions: () => void
  lastEditTime: number
  setLastEditTime: (time: number) => void
  // multi-tab
  docs: Array<{ id: string; title: string; path: string; libraryId?: string }>
  activeDocId: string | null
  createDoc: (title?: string, path?: string, libraryId?: string) => string
  switchDoc: (id: string) => void
  closeDoc: (id: string) => void
  renameDoc: (id: string, title: string) => void
  docsMd: Record<string, string>
  setDocsMd: (mds: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  updateDoc: (params: { md?: string; html?: string; docsMd?: Record<string, string> }) => void
}

export type SettingsGroup = 'theme' | 'editor' | 'app' | 'ai' | 'shortcut' | 'export' | 'sync' | 'advanced' | 'about'

export interface SettingsState {
  provider: string
  model: string
  apiKey: string
  customBaseUrl: string
  temperature: number
  maxTokens: number
  apiKeys: ApiKeyEntry[]
  selectedModelId: string
  theme: 'dark' | 'light' | 'system'
  accentColor: string
  shortcut: string
  activeGroup: SettingsGroup
  subTab?: string
  // ── Editor layout ──
  editorFont?: string
  defaultFontSize?: number
  fontSize?: number
  lineHeight?: '1.0' | '1.5' | '2.0'
  contentWidth?: '960' | '1024' | '1200' | '1280'
  showMarkdownMarkers?: boolean
  showDiffHighlight?: boolean
  typewriterMode?: boolean
  focusMode?: boolean
  previewModeEnabled?: boolean
  // ── Navigation layout ──
  navMode?: 'top' | 'left'
  toolbarCollapsed?: boolean
  toolbarWidth?: number
  // ── Toolbar ──
  showAllToolbarButtons?: boolean
  showToolbarLabels?: boolean
  // ── Startup / app behavior ──
  enableTabs?: boolean
  saveClipboardOnLaunch?: boolean
  showTrayIcon?: boolean
  reopenLastDoc?: boolean
  openInNewWindow?: boolean
  quitWhenAllWindowsClosed?: boolean
  // ── Localization ──
  enableSpellCheck?: boolean
  spellCheckLang?: string
  allowMarkdownSymbols?: boolean
  autoCompleteMarkdownPairs?: boolean
  smartQuotes?: boolean
  autoSpaceCJK?: boolean
  cornerQuotes?: boolean
  fullwidthSymbols?: boolean
  showLineNumbers?: boolean
  // ── AI Settings (bid-maker style) ──
  configTab?: 'provider' | 'custom'
  customApiFormat?: 'openai' | 'anthropic'
  customEndpoint?: string
  customModelId?: string
  selectedProvider?: string
  selectedModelName?: string
  // ── Typography & reading ──
  headingStyles?: Record<string, string>
  textIndent?: boolean
  textJustify?: boolean
  linkColor?: string
  blockquoteBackground?: string
  // ── Export ──
  exportFormat?: string
  typographyTheme?: string
  codeTheme?: string
  macCodeBlock?: boolean
  includeTOC?: boolean
  includeLineNumbers?: boolean
  includePageNumbers?: boolean
  paperSize?: string
  orientation?: string
  syncProvider?: string
  backupInterval?: string
  backupKeep?: number
  devTools?: boolean
  hardwareAccel?: boolean
  logLevel?: string
  stylePreviewMode?: string
}

export interface ThemeState {
  mode: 'dark' | 'light' | 'system'
  accentColor: string
}

export interface AIStoreState {
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
