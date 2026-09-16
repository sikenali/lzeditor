import { useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore'

export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Apply theme + accent to <html>.
 * Run synchronously before first paint (main.tsx) and from the React hook.
 */
export function applyTheme(theme: string, accent: string): void {
  const root = document.documentElement

  // Resolve theme mode
  let mode: ThemeMode = 'dark'
  if (theme === 'light') mode = 'light'
  else if (theme === 'system') {
    mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Set data attributes (lzmail pattern)
  root.setAttribute('data-theme', mode)
  root.setAttribute('data-accent', accent)
}

export function useTheme() {
  const theme = useSettingsStore(s => s.theme)
  const accentColor = useSettingsStore(s => s.accentColor)

  useEffect(() => {
    applyTheme(theme, accentColor)
  }, [theme, accentColor])

  // Follow OS theme while in "system" mode
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme(theme, accentColor)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme, accentColor])
}
