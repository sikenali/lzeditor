import { create } from 'zustand'
import type { SettingsState } from '../shared/types'

const DEFAULT_SETTINGS: SettingsState = {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  apiKey: '',
  customBaseUrl: '',
  temperature: 0.7,
  maxTokens: 1024,
  theme: 'dark',
  accentColor: '#39FF9E',
  shortcut: 'Ctrl+/',
  activeGroup: 'general',
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const saved = localStorage.getItem('lzeditor-settings')
  if (saved) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved), activeGroup: 'general' }
    } catch {}
  }
  return DEFAULT_SETTINGS
})

export function saveSettings(settings: Partial<SettingsState>) {
  const current = useSettingsStore.getState()
  const updated = { ...current, ...settings }
  useSettingsStore.setState(updated)
  try {
    const { activeGroup, ...rest } = updated
    localStorage.setItem('lzeditor-settings', JSON.stringify(rest))
  } catch {}
}
