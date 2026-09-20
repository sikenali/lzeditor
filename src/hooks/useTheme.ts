import { useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import { applyTypographyTheme } from '../styles/typography-themes'
import { getCodeTheme } from '../styles/code-themes'

export type ThemeMode = 'light' | 'dark' | 'system'

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
  const map: Record<string, string> = {
    red:    '#c44d3d',
    teal:   '#6b8fa3',
    green:  '#3ba873',
    gold:   '#c9a84c',
    ink:    '#1a1a1a',
  }
  return map[presetId] ?? '#3ba873'
}

/**
 * Apply theme + typography theme.
 *
 * Two independent systems:
 * 1. data-theme (dark/light) → controls chrome colors via [data-theme] CSS selectors in color-tokens.css
 * 2. data-typography-theme → controls article content via injected CSS in typography-themes.ts
 */
export function applyTheme(theme: ThemeMode, accent: string): void {
  const root = document.documentElement

  // Resolve effective theme mode
  let mode: ThemeMode = 'dark'
  if (theme === 'light') mode = 'light'
  else if (theme === 'system') {
    mode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  // Set data attributes — CSS selectors drive chrome colors
  root.setAttribute('data-theme', mode)
  root.setAttribute('data-accent', accent)

  // ── Dynamic accent alpha variants (used by JS components) ──────────
  const hex = getAccentHex(accent)
  const rgb = hexToRgb(hex)
  const s = root.style
  s.setProperty('--accent-primary', rgba(rgb, 1))
  s.setProperty('--accent-a3',  rgba(rgb, 0.03))
  s.setProperty('--accent-a5',  rgba(rgb, 0.05))
  s.setProperty('--accent-a8',  rgba(rgb, 0.08))
  s.setProperty('--accent-a10', rgba(rgb, 0.10))
  s.setProperty('--accent-a15', rgba(rgb, 0.15))
  s.setProperty('--accent-a20', rgba(rgb, 0.20))
  s.setProperty('--accent-a30', rgba(rgb, 0.30))
  s.setProperty('--accent-a40', rgba(rgb, 0.40))
  s.setProperty('--accent-a60', rgba(rgb, 0.60))
  s.setProperty('--accent-soft', rgba(rgb, 0.15))
  s.setProperty('--accent-border', rgba(rgb, 0.2))
  s.setProperty('--accent-glow', `0 0 12px ${rgba(rgb, 0.2)}`)
  s.setProperty('--ai-panel-border', rgba(rgb, 0.3))
  s.setProperty('--ai-loading-dot', rgba(rgb, 0.6))
}

export function useTheme() {
  const theme = useSettingsStore(s => s.theme)
  const accentColor = useSettingsStore(s => s.accentColor)
  const typographyTheme = useSettingsStore(s => s.typographyTheme || 'classic')
  const codeTheme = useSettingsStore(s => s.codeTheme || 'atom-one-dark')
  const macCodeBlock = useSettingsStore(s => s.macCodeBlock)

  // Apply theme whenever any of these change
  useEffect(() => {
    applyTheme(theme, accentColor)
  }, [theme, accentColor])

  // Apply typography theme (article content styling)
  useEffect(() => {
    applyTypographyTheme(typographyTheme)
  }, [typographyTheme])

  // Apply code highlight theme dynamically
  useEffect(() => {
    const themeObj = getCodeTheme(codeTheme)
    let codeStyleEl = document.getElementById('lz-code-theme-css') as HTMLStyleElement | null
    if (!codeStyleEl) {
      codeStyleEl = document.createElement('style')
      codeStyleEl.id = 'lz-code-theme-css'
      document.head.appendChild(codeStyleEl)
    }
    import(/* @vite-ignore */ `highlight.js/styles/${themeObj.file}.css`).then((mod: any) => {
      codeStyleEl!.textContent = mod.default || ''
    }).catch(() => {
      codeStyleEl!.textContent = ''
    })
  }, [codeTheme])

  // Mac code block window decoration
  useEffect(() => {
    const root = document.documentElement
    if (macCodeBlock) root.setAttribute('data-mac-code', 'true')
    else root.removeAttribute('data-mac-code')
  }, [macCodeBlock])

  // Follow OS theme while in "system" mode
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme(theme, accentColor)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme, accentColor])
}
