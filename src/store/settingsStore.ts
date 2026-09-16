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
  accentColor: '#39FF9E',
  shortcut: 'Ctrl+/',
  activeGroup: 'general',
}

type SettingsStore = SettingsState & {
  setActiveGroup: (group: SettingsGroup) => void
  updateSetting: (key: keyof SettingsState, value: any) => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...DEFAULT_SETTINGS,

  setActiveGroup: (activeGroup) => set({ activeGroup }),
  updateSetting: (key, value) => set({ [key]: value }),
}))

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
