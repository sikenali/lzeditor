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
  accentColor: 'green',
  shortcut: 'Ctrl+/',
  activeGroup: 'general',
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
  updateSetting: (key: keyof SettingsState, value: any) => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,

  setActiveGroup: (activeGroup) => set({ activeGroup }),
  updateSetting: (key, value) => set({ [key]: value }),
}))

/** Resolve the effective accent color for a given preset id. */
export function getAccentColor(presetId: string): string {
  return ACCENT_PRESETS.find(p => p.id === presetId)?.color ?? '#39ff9e'
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
