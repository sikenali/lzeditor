import { create } from 'zustand'
import type { SettingsState, SettingsGroup } from '../shared/types'

export const DEFAULT_SETTINGS: SettingsState = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  apiKey: '',
  customBaseUrl: '',
  temperature: 0.7,
  maxTokens: 1024,
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
  // ── Toolbar defaults ──
  showAllToolbarButtons: true,
  showToolbarLabels: true,
  // ── Startup / app behavior defaults ──
  enableTabs: true,
  saveClipboardOnLaunch: false,
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
  // ── Sync / Backup defaults ──
  syncProvider: '',
  backupInterval: '30s',
  backupKeep: 50,
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
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,

  setActiveGroup: (activeGroup) => set({ activeGroup }),
  setSubTab: (subTab) => set({ subTab }),
  updateSetting: (key, value) => set({ [key]: value }),
}))

/** Resolve the effective accent color for a given preset id. */
export function getAccentColor(presetId: string): string {
  return ACCENT_PRESETS.find(p => p.id === presetId)?.color ?? '#5b8c5a'
}

export function saveSettingsToStorage(settings: Partial<SettingsState>) {
  try {
    localStorage.setItem('lzeditor-settings', JSON.stringify(settings))
  } catch {
    // ignore
  }
}

export function loadSettingsFromStorage(): Partial<SettingsState> {
  try {
    const saved = localStorage.getItem('lzeditor-settings')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // ignore
  }
  return {}
}
