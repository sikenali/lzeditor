import { create } from 'zustand'
import type { SettingsState, SettingsGroup, ApiKeyEntry } from '../shared/types'
import { ACCENT_PRESETS } from '../styles/themes'
import { DEFAULT_TYPOGRAPHY_THEME } from '../styles/acks-mapping'

export { ACCENT_PRESETS } from '../styles/themes'

export const DEFAULT_API_KEYS: ApiKeyEntry[] = []


/** 老存档按 id 跟默认条目合并，补上后来新增的字段 */
export function migrateApiKey(entry: ApiKeyEntry): ApiKeyEntry {
  const base = DEFAULT_API_KEYS.find(d => d.id === entry.id)
  return base ? { ...base, ...entry } : entry
}

/**
 * 设置存档版本。
 * - v1：previewModeEnabled 默认 true（分屏源码+预览）、contentWidth 默认 '1024'。
 *   老存档里的这些值是旧默认值被 saveSettingsToStorage 全量落盘写入，并非用户显式开启。
 * - v2：previewModeEnabled 默认改为 false（仅源码编辑器）。升级时把老存档的 true 迁移为 false，
 *   否则老用户升级后右侧预览仍然显示。
 * - v3：contentWidth 默认改为 '1280'（铺满编辑区，.app 限宽 1280px）。升级时把老存档的
 *   '1024'（旧默认值）迁移为 '1280'，否则老用户升级后文本仍不铺满。
 * - v5：contentWidth 默认改为 '1024'（宽屏内容列，用户拍板改窄→宽）。升级时把老存档的
 *   '760'（v4 旧默认值）迁移为 '1024'，否则老用户升级后内容列仍窄。
 */
export const SETTINGS_VERSION = 5
/** v1→v2：previewModeEnabled 默认 true（分屏）→ false（仅源码编辑器）。 */
export const PREVIEW_MODE_OFF_VERSION = 2
/** v2→v3：contentWidth 默认 '1024' → '1280'（铺满编辑区）。 */
export const CONTENT_WIDTH_FULL_VERSION = 3
/** v3→v4：内容测度统一 760px——contentWidth 默认 '1280' → '760'。 */
export const CONTENT_WIDTH_MEASURE_VERSION = 4
/** v4→v5：宽屏内容列 1024px——contentWidth 默认 '760' → '1024'。 */
export const CONTENT_WIDTH_DEFAULT_WIDE_VERSION = 5

export const DEFAULT_SETTINGS: SettingsState = {
  temperature: 0.7,
  maxTokens: 1024,
  apiKeys: DEFAULT_API_KEYS,
  selectedModelId: '',
  theme: 'parchment',
  accentColor: 'cyan',
  activeGroup: 'theme',
  subTab: '',
  exportFormat: 'pdf',
  typographyTheme: DEFAULT_TYPOGRAPHY_THEME,
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
  typewriterMode: false,
  focusMode: false,
  previewModeEnabled: false,
  navMode: 'top' as 'top' | 'left',
  codeSplitRatio: 0.5,
  // ── Toolbar defaults ──
  quickFormatButtons: true,
  showToolbarLabels: true,
  // ── Startup / app behavior defaults ──
  enableTabs: true,
  showTrayIcon: false, // 优化 #29：托盘图标默认关闭；lpk（网页端无主进程托盘）不显示该设置行
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
  currentLine: true,
  softWrap: true,
  tabSize: 2,
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
  /** 恢复默认：重置除 API Key / 当前选中模型外的全部设置。 */
  resetSettings: () => void
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

  toggleApiKey: (id) => set((state) => {
    const apiKeys = state.apiKeys.map((k) => k.id === id ? { ...k, enabled: !k.enabled } : k)
    // 关闭当前选中的 Key 时，自动改选下一个「已启用且填了 Key」的条目；
    // 否则 useAI 会继续按 selectedModelId 使用一个已被关掉的 Key。
    let selectedModelId = state.selectedModelId
    const toggled = apiKeys.find((k) => k.id === id)
    if (toggled && !toggled.enabled && state.selectedModelId === id) {
      selectedModelId = apiKeys.find((k) => k.enabled && k.key)?.id ?? ''
    }
    return { apiKeys, selectedModelId }
  }),

  setSelectedModelId: (id) => set({ selectedModelId: id }),

  resetSettings: () => set((state) => ({
    ...DEFAULT_SETTINGS,
    // 密钥和当前模型是用户数据，恢复默认外观/编辑器设置时不能清掉。
    apiKeys: state.apiKeys,
    selectedModelId: state.selectedModelId,
    activeGroup: state.activeGroup,
    subTab: state.subTab,
  })),
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
  return ACCENT_PRESETS.find(p => p.id === presetId)?.color ?? '#00D4AA'
}

export function saveSettingsToStorage(settings: Partial<SettingsState>) {
  try {
    const { apiKeys, ...rest } = settings
    localStorage.setItem('lzeditor-settings', JSON.stringify({ ...rest, settingsVersion: SETTINGS_VERSION }))
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
    if (saved) {
      const raw = JSON.parse(saved) as Partial<SettingsState> & { settingsVersion?: number }
      const version = (raw && typeof raw.settingsVersion === 'number') ? raw.settingsVersion : 1
      // 迁移 v1→v2：previewModeEnabled 默认 true（分屏）→ false（仅源码编辑器）。
      // 老存档里的 true 是旧默认值全量落盘，并非用户显式开启，按新默认迁移为 false。
      if (version < PREVIEW_MODE_OFF_VERSION && raw?.previewModeEnabled === true) {
        raw.previewModeEnabled = false
      }
      // 迁移 v2→v3：contentWidth 默认 '1024' → '1280'（铺满编辑区，.app 限宽 1280px）。
      // 老存档里的 '1024' 是旧默认值全量落盘，并非用户显式开启，按新默认迁移为 '1280'。
      if (version < CONTENT_WIDTH_FULL_VERSION && raw?.contentWidth === '1024') {
        raw.contentWidth = '1280'
      }
      // 迁移 v3→v4：内容测度统一 760px——老存档 '1280'/'1024' 都是旧默认值全量落盘，
      // 并非用户显式开启，按新默认统一迁移为 '760'。
      if (version < CONTENT_WIDTH_MEASURE_VERSION && (raw?.contentWidth === '1280' || raw?.contentWidth === '1024')) {
        raw.contentWidth = '760'
      }
      // 迁移 v4→v5：宽屏内容列 1024px——老存档 '760' 是 v4 旧默认值全量落盘，
      // 并非用户显式开启，按新默认迁移为 '1024'（用户拍板改窄→宽）。
      if (version < CONTENT_WIDTH_DEFAULT_WIDE_VERSION && raw?.contentWidth === '760') {
        raw.contentWidth = '1024'
      }
      Object.assign(parsed, raw)
    }
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
