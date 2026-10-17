import { useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import { applyTypographyTheme } from '../styles/typography-themes'
import { getCodeTheme } from '../styles/code-themes'
import { themeTokens, ACCENT_PRESETS, type ThemeType } from '../styles/themes'

export type ThemeMode = ThemeType

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

/** Legacy accent ids → new preset colors */
const LEGACY_ACCENTS: Record<string, string> = {
  red: '#BE3B2E',
  vermilion: '#BE3B2E',
  gold: '#D3A93F',
  green: '#3E8C6E',
  jade: '#3E8C6E',
  teal: '#4A72A8',
  cloud: '#4A72A8',
  ink: '#2F3640',
}

/** Resolve an accent id (legacy or new) or raw hex into a hex color. */
function resolveAccent(accent: string | undefined | null): string {
  if (!accent) return ACCENT_PRESETS[0].color
  const trimmed = accent.trim()
  if (trimmed.startsWith('#')) return trimmed
  return LEGACY_ACCENTS[trimmed] ?? ACCENT_PRESETS.find(a => a.id === trimmed)?.color ?? ACCENT_PRESETS[0].color
}

/** Normalize an incoming theme value into the 2-value bid-maker model. */
export function resolveTheme(theme: string): ThemeType {
  if (theme === 'dark') return 'dark'
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'parchment'
  }
  return 'parchment'
}

/**
 * Apply theme + typography theme.
 *
 * Colour source of truth is the bid-maker `--color-*` token system
 * (src/styles/tokens.css + themes.ts). Tokens are written inline on <html>.
 *
 * `data-theme` keeps the legacy `light`/`dark` values so the large body of
 * existing `[data-theme="dark"]` / `[data-theme="light"]` content CSS keeps
 * working unchanged; `data-palette` carries the canonical parchment/dark name.
 */
export function applyTheme(theme: string, accent?: string): void {
  const root = document.documentElement
  const type = resolveTheme(theme)

  root.setAttribute('data-theme', type === 'dark' ? 'dark' : 'light')
  root.setAttribute('data-palette', type)
  root.setAttribute('data-accent', resolveAccentId(accent))

  const s = root.style
  for (const [key, value] of Object.entries(themeTokens[type])) {
    s.setProperty(key, value)
  }

  // ── Accent colour overrides the theme default primary ──
  const hex = resolveAccent(accent)
  const rgb = hexToRgb(hex)
  s.setProperty('--color-primary', hex)
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

function resolveAccentId(accent?: string): string {
  if (!accent) return 'vermilion'
  const trimmed = accent.trim()
  if (trimmed.startsWith('#')) {
    return ACCENT_PRESETS.find(a => a.color.toLowerCase() === trimmed.toLowerCase())?.id ?? 'vermilion'
  }
  return trimmed
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
}
