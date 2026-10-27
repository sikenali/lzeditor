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
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    format: 'openai',
  },
]

/** 老存档按 id 跟默认条目合并，补上后来新增的字段 */
export function migrateApiKey(entry: ApiKeyEntry): ApiKeyEntry {
  const base = DEFAULT_API_KEYS.find(d => d.id === entry.id)
  return base ? { ...base, ...entry } : entry
}

export const DEFAULT_SETTINGS: SettingsState = {
  temperature: 0.7,
  maxTokens: 1024,
  apiKeys: DEFAULT_API_KEYS,
  selectedModelId: 'anthropic-claude',
  theme: 'parchment',
  accentColor: 'vermilion',
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
  defaultFontSize: 16,
  lineHeight: '1.7',
  contentWidth: '1024',
  showMarkdownMarkers: true,
  typewriterMode: false,
  focusMode: false,
  previewModeEnabled: true,
  navMode: 'top' as 'top' | 'left',
  codeSplitRatio: 0.5,
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
  // ── CodeMirror 6 settings ──
  autoPair: true,
  continueLists: true,
  currentLine: true,
  softWrap: true,
  tabSize: 2,
  livePreview: false,
  // ── Typography & reading ──
  textIndent: false,
  // 中文正文两端对齐是排版惯例，默认开；改行高后不留右边缺口
  textJustify: true,
  // ── AI Settings (bid-maker style) ──
  customApiFormat: 'openai',
  customEndpoint: '',
  customModelId: '',
  selectedProvider: '',
  selectedModelName: '',
  modelConfigTab: 'provider' as 'provider' | 'custom',
}

type SettingsStore = SettingsState & {
  setActiveGroup: (group: SettingsGroup) => void
  setSubTab: (subTab: string) => void
  updateSetting: (key: keyof SettingsState, value: any) => void
  removeApiKey: (id: string) => void
  toggleApiKey: (id: string) => void
  setSelectedModelId: (id: string) => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,

  setActiveGroup: (activeGroup) => set({ activeGroup }),
  setSubTab: (subTab) => set({ subTab }),
  updateSetting: (key, value) => set({ [key]: value }),

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

// 落盘不能绑在 SettingsDialog 的生命周期上：ExportDialog、CodeDialog、
// StyleMainPanel、Footer 也在改设置，它们不经过设置中心，改动就全丢了。
// 订阅全 store，防抖 250ms 写一次；activeGroup / subTab 是导航态，跳过。
const PERSIST_SKIP = new Set(['activeGroup', 'subTab'])
let saveTimer: ReturnType<typeof setTimeout> | null = null
function flushSave(): void {
  saveTimer = null
  saveSettingsToStorage(useSettingsStore.getState())
}
useSettingsStore.subscribe((state, prev) => {
  let dirty = false
  for (const key of Object.keys(state) as (keyof SettingsState)[]) {
    if (PERSIST_SKIP.has(key)) continue
    if (state[key] !== prev[key]) {
      dirty = true
      break
    }
  }
  if (!dirty) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(flushSave, 250)
})
// 关机/退出不触发定时器，退出前必须同步写一次
window.addEventListener('beforeunload', () => {
  if (saveTimer) {
    clearTimeout(saveTimer)
    flushSave()
  }
})

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
  const parsed: Partial<SettingsState> = {}
  try {
    const saved = localStorage.getItem('lzeditor-settings')
    if (saved) Object.assign(parsed, JSON.parse(saved) as Partial<SettingsState>)
  } catch {
    // 存档损坏时忽略，退回默认值
  }
  try {
    const keysSaved = localStorage.getItem('lzeditor-api-keys')
    if (keysSaved) {
      const raw = JSON.parse(keysSaved)
      // 整包替换会让老存档丢掉后来新增的字段（比如 format / endpoint），
      // 按 id 跟默认条目合并补上；用户自己加的条目原样保留
      parsed.apiKeys = Array.isArray(raw) ? raw.map(migrateApiKey) : undefined
    }
  } catch {}
  // 主题和强调色存在独立的 key 里，不能挂在 lzeditor-settings 存在的条件下读：
  // 手改过或半写入失败的存档会把主题整块丢掉
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
