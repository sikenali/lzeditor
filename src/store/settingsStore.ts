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
  { id: 'green',  name: '翠绿',   color: '#39ff9e' },
  { id: 'cyan',   name: '青蓝',   color: '#00d4ff' },
  { id: 'purple', name: '紫罗兰', color: '#a855f7' },
  { id: 'orange', name: '橙色',   color: '#ff8c42' },
  { id: 'rose',   name: '玫红',   color: '#f43f5e' },
  { id: 'amber',  name: '琥珀',   color: '#f59e0b' },
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
