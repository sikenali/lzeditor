import { useEffect } from 'react'
import { useThemeStore } from '../store/themeStore'
import { useSettingsStore } from '../store/settingsStore'

export function useTheme() {
  const theme = useThemeStore()
  const settings = useSettingsStore()

  useEffect(() => {
    const root = document.documentElement
    const mode = settings.theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : settings.theme

    root.style.setProperty('--accent-primary', settings.accentColor)
    root.classList.remove('light', 'dark')
    root.classList.add(mode)
  }, [settings.theme, settings.accentColor])

  return theme
}
