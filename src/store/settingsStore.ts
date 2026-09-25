import { create } from 'zustand'
import type { SettingsState, SettingsGroup, ApiKeyEntry } from '../shared/types'

export const DEFAULT_API_KEYS: ApiKeyEntry[] = [
  {
    id: 'anthropic-claude',
    provider: 'Anthropic',
    model: 'claude-3-5-sonnet-20241022',
    modelName: 'Claude 3.5 Sonnet',
    key: '',
    enabled: false,
    format: 'anthropic',
  },
  {
    id: 'openai-gpt4o',
    provider: 'OpenAI',
    model: 'gpt-4o',
    modelName: 'GPT-4o',
    key: '',
    enabled: false,
    format: 'openai',
  },
  {
    id: 'qwen-max',
    provider: '通义千问',
    model: 'qwen-max',
    modelName: 'Qwen Max',
    key: '',
    enabled: false,
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode',
    format: 'openai',
  },
]

export const DEFAULT_SETTINGS: SettingsState = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  apiKey: '',
  customBaseUrl: '',
  temperature: 0.7,
  maxTokens: 1024,
  apiKeys: DEFAULT_API_KEYS,
  selectedModelId: 'anthropic-claude',
  theme: 'light',
  accentColor: 'ink',
  shortcut: 'Ctrl+/',
  activeGroup: 'theme',
  subTab: '',
  exportFormat: 'pdf',
  typographyTheme: 'classic',
  codeTheme: 'atom-one-dark',
  macCodeBlock: false,
  includeTOC: true,
  includeLineNumbers: false,
  includePageNumbers: false,
  paperSize: 'a4',
  orientation: 'portrait',
  // ── Editor layout defaults ──
  editorFont: 'sans-serif',
  defaultFontSize: 17,
  fontSize: 17,
  lineHeight: '1.5',
  contentWidth: '1024',
  showMarkdownMarkers: true,
  showDiffHighlight: true,
  typewriterMode: false,
  focusMode: false,
  previewModeEnabled: true,
  navMode: 'top' as 'top' | 'left',
  toolbarCollapsed: false,
  toolbarWidth: 220,
  // ── Toolbar defaults ──
  // 精简工具栏：默认开启，仅显示格式/图片/链接/表格/插入，右侧隐藏 AI
  compactToolbar: true,
  showToolbarLabels: true,
  // ── Startup / app behavior defaults ──
  enableTabs: true,
  saveClipboardOnLaunch: false,
  showTrayIcon: true,
  reopenLastDoc: true,
  stylePreviewMode: 'none',
  openInNewWindow: false,
  quitWhenAllWindowsClosed: true,
  // ── Localization defaults ──
  enableSpellCheck: true,
  spellCheckLang: 'zh-CN',
  allowMarkdownSymbols: true,
  autoCompleteMarkdownPairs: true,
  smartQuotes: true,
  autoSpaceCJK: true,
  cornerQuotes: false,
  fullwidthSymbols: false,
  showLineNumbers: false,
  // ── Typography & reading ──
  headingStyles: {},
  textIndent: false,
  textJustify: false,
  linkColor: '',
  blockquoteBackground: '',
  // ── Sync / Backup defaults ──
  syncProvider: '',
  backupInterval: '30s',
  backupKeep: 50,
  // ── AI Settings (bid-maker style) ──
  configTab: 'provider',
  customApiFormat: 'openai',
  customEndpoint: '',
  customModelId: '',
  selectedProvider: '',
  selectedModelName: '',
}

export const ACCENT_PRESETS: { id: string; name: string; color: string }[] = [
  { id: 'red',    name: '朱红',   color: '#c43d3d' },
  { id: 'teal',   name: '云蓝',   color: '#6b8fa3' },
  { id: 'green',  name: '玉绿',   color: '#5b8c5a' },
  { id: 'gold',   name: '金色',   color: '#c9a96e' },
  { id: 'ink',    name: '墨色',   color: '#3d2b1f' },
]

type SettingsStore = SettingsState & {
  setActiveGroup: (group: SettingsGroup) => void
  setSubTab: (subTab: string) => void
  updateSetting: (key: keyof SettingsState, value: any) => void
  addApiKey: (key: ApiKeyEntry) => void
  removeApiKey: (id: string) => void
  toggleApiKey: (id: string) => void
  setSelectedModelId: (id: string) => void
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,

  setActiveGroup: (activeGroup) => set({ activeGroup }),
  setSubTab: (subTab) => set({ subTab }),
  updateSetting: (key, value) => set({ [key]: value }),

  addApiKey: (key) => set((state) => ({
    apiKeys: [...state.apiKeys, key],
    selectedModelId: key.id,
  })),

  removeApiKey: (id) => set((state) => {
    const remaining = state.apiKeys.filter((k) => k.id !== id)
    const nextSelected = state.selectedModelId === id
      ? (remaining.find((k) => k.enabled && k.key)?.id ?? remaining[0]?.id ?? '')
      : state.selectedModelId
    return { apiKeys: remaining, selectedModelId: nextSelected }
  }),

  toggleApiKey: (id) => set((state) => ({
    apiKeys: state.apiKeys.map((k) => k.id === id ? { ...k, enabled: !k.enabled } : k),
  })),

  setSelectedModelId: (id) => set({ selectedModelId: id }),
}))

/** Resolve the effective accent color for a given preset id. */
export function getAccentColor(presetId: string): string {
  return ACCENT_PRESETS.find(p => p.id === presetId)?.color ?? '#5b8c5a'
}

export function saveSettingsToStorage(settings: Partial<SettingsState>) {
  try {
    const { apiKeys, ...rest } = settings
    localStorage.setItem('lzeditor-settings', JSON.stringify(rest))
    if (apiKeys) {
      localStorage.setItem('lzeditor-api-keys', JSON.stringify(apiKeys))
    }
  } catch {
    // ignore
  }
}

export function loadSettingsFromStorage(): Partial<SettingsState> {
  try {
    const saved = localStorage.getItem('lzeditor-settings')
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<SettingsState>
      try {
        const keysSaved = localStorage.getItem('lzeditor-api-keys')
        if (keysSaved) parsed.apiKeys = JSON.parse(keysSaved)
      } catch {}
      return parsed
    }
  } catch {
    // ignore
  }
  return {}
}
