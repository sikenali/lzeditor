import { create } from 'zustand'
import type { SettingsState, SettingsGroup, ApiKeyEntry } from '../shared/types'
import { ACCENT_PRESETS } from '../styles/themes'

export { ACCENT_PRESETS } from '../styles/themes'

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
  temperature: 0.7,
  maxTokens: 1024,
  apiKeys: DEFAULT_API_KEYS,
  selectedModelId: 'anthropic-claude',
  theme: 'parchment',
  accentColor: 'vermilion',
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
  typewriterMode: false,
  focusMode: false,
  previewModeEnabled: true,
  navMode: 'top' as 'top' | 'left',
  // ── Toolbar defaults ──
  quickFormatButtons: true,
  showToolbarLabels: true,
  // ── Startup / app behavior defaults ──
  enableTabs: true,
  showTrayIcon: true,
  reopenLastDoc: true,
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
  // ── AI Settings (bid-maker style) ──
  customApiFormat: 'openai',
  customEndpoint: '',
  customModelId: '',
  selectedProvider: '',
  selectedModelName: '',
}

type SettingsStore = SettingsState & {
  setActiveGroup: (group: SettingsGroup) => void
  setSubTab: (subTab: string) => void
  updateSetting: (key: keyof SettingsState, value: any) => void
  addApiKey: (key: ApiKeyEntry) => void
  removeApiKey: (id: string) => void
  toggleApiKey: (id: string) => void
  setSelectedModelId: (id: string) => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
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

/** Resolve the effective accent color for a given preset id (or a raw hex). */
export function getAccentColor(presetId: string): string {
  if (presetId && /^#[0-9a-fA-F]{6}$/.test(presetId)) return presetId
  return ACCENT_PRESETS.find(p => p.id === presetId)?.color ?? '#C0392B'
}

export function saveSettingsToStorage(settings: Partial<SettingsState>) {
  try {
    const { apiKeys, ...rest } = settings
    localStorage.setItem('lzeditor-settings', JSON.stringify(rest))
    if (settings.theme) localStorage.setItem('lzeditor-theme', settings.theme)
    if (settings.accentColor) localStorage.setItem('lzeditor-accent', getAccentColor(settings.accentColor))
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
      const themeSaved = localStorage.getItem('lzeditor-theme')
      if (themeSaved) parsed.theme = themeSaved as SettingsState['theme']
      const accentSaved = localStorage.getItem('lzeditor-accent')
      if (accentSaved) {
        parsed.accentColor = ACCENT_PRESETS.find(
          p => p.id === accentSaved || p.color.toLowerCase() === accentSaved.toLowerCase(),
        )?.id ?? parsed.accentColor
      }
      return parsed
    }
  } catch {
    // ignore
  }
  return {}
}
