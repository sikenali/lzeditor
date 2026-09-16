import { useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore'

export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * Apply theme + accent to <html>.
 * Run synchronously before first paint (main.tsx) and from the React hook.
 */
/** Parse hex color to RGB */
function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return [0, 0, 0]
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgba(rgb: [number, number, number], alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
}

/** Get accent color hex for a given preset id */
function getAccentHex(presetId: string): string {
  const map: Record<string, { dark: string; light: string }> = {
    red:    { dark: '#c43d3d', light: '#c43d3d' },
    teal:   { dark: '#5a9b8c', light: '#4a7b8c' },
    green:  { dark: '#5b8c5a', light: '#5b8c5a' },
    gold:   { dark: '#c9a96e', light: '#b28014' },
    ink:    { dark: '#3d2b1f', light: '#6b5b4f' },
  }
  return map[presetId]?.dark ?? '#5b8c5a'
}

export function applyTheme(theme: string, accent: string): void {
  const root = document.documentElement

  // Resolve theme mode
  let mode: ThemeMode = 'dark'
  if (theme === 'light') mode = 'light'
  else if (theme === 'system') {
    mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Set data attributes
  root.setAttribute('data-theme', mode)
  root.setAttribute('data-accent', accent)

  // Set dynamic CSS variables for alpha variants (fallback for browsers without color-mix)
  const hex = getAccentHex(accent)
  const rgb = hexToRgb(hex)
  const s = root.style
  s.setProperty('--accent-primary', rgba(rgb, 1))
  s.setProperty('--accent-a3', rgba(rgb, 0.03))
  s.setProperty('--accent-a5', rgba(rgb, 0.05))
  s.setProperty('--accent-a8', rgba(rgb, 0.08))
  s.setProperty('--accent-a10', rgba(rgb, 0.1))
  s.setProperty('--accent-a15', rgba(rgb, 0.15))
  s.setProperty('--accent-a20', rgba(rgb, 0.2))
  s.setProperty('--accent-a30', rgba(rgb, 0.3))
  s.setProperty('--accent-a40', rgba(rgb, 0.4))
  s.setProperty('--accent-a60', rgba(rgb, 0.6))
  s.setProperty('--accent-soft', rgba(rgb, 0.15))
  s.setProperty('--accent-border', rgba(rgb, 0.2))
  s.setProperty('--accent-glow', `0 0 12px ${rgba(rgb, 0.2)}`)
  s.setProperty('--ai-panel-border', rgba(rgb, 0.3))
  s.setProperty('--ai-loading-dot', rgba(rgb, 0.6))
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
