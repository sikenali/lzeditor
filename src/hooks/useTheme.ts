import { useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore'
import { applyTypographyTheme } from '../styles/typography-themes'
import { DEFAULT_TYPOGRAPHY_THEME } from '../styles/acks-mapping'
import { getCodeTheme } from '../styles/code-themes'
import { themeTokens, ACCENT_PRESETS, type ThemeType } from '../styles/themes'

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

/** Hex → HSL（色相 0-360，饱和度/亮度 0-1），用于保色相提亮。 */
function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s, l]
}

/** HSL → Hex。 */
function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

/** WCAG 相对亮度。 */
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** 深色强调色亮度地板 ≈ #E05050 的相对亮度（DESIGN.md §1 要求对比度 ≥ 4.5:1）。 */
const DARK_ACCENT_FLOOR_LUM = relativeLuminance('#E05050')

/** Legacy accent ids → new preset colors */
// Nebula 迁移：旧强调色 id（vermilion/jade/cloud/ink/red/teal）已不存在于新色板。
// 清空该映射，使这些持久化的旧 id 经 resolveAccent 落到 ACCENT_PRESETS[0]（电光青）。
// gold/green 仍在新色板，直接由 ACCENT_PRESETS 解析为新色值。自定义 hex 不受影响。
const LEGACY_ACCENTS: Record<string, string> = {
}

/** Dark-mode boost: if the resolved accent is dimmer than the design floor
 *  (#E05050, DESIGN.md §1), fall back to the theme's built-in brighter red.
 *  User-picked accents with their own dark counterparts keep their own value. */
const DARK_ACCENT_BOOST: Record<string, string> = {
  '#C0392B': '#E05050',
  '#BE3B2E': '#E05050',
}

/**
 * 深色下把强调色提到亮度地板之上，保证对比度（DESIGN.md §1/§7）。
 * 先查显式映射（红→亮红，保持品牌红不变）；其余色（鎏金/玉绿/云蓝/黛墨及
 * 自定义色）按原色相提升亮度直到 ≥ 地板，避免黛墨 #2F3640 对 #17171A 只有
 * ~1.5:1 的低对比。已达标（如鎏金）原样返回，不改动。
 */
function ensureDarkAccent(hex: string): string {
  const boosted = DARK_ACCENT_BOOST[hex]
  if (boosted) return boosted
  if (relativeLuminance(hex) >= DARK_ACCENT_FLOOR_LUM) return hex
  const [h, s, l] = hexToHsl(hex)
  let L = l
  for (let i = 0; i < 40; i++) {
    L = Math.min(0.92, L + 0.03)
    if (relativeLuminance(hslToHex(h, s, L)) >= DARK_ACCENT_FLOOR_LUM) break
  }
  return hslToHex(h, s, L)
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
  // 深色下：若命中 Nebula 预设，用其 dark 变体（如青 #00F5C8，忠实 lzc2vsdx）；
  // 否则保色相提亮自定义 hex 到亮度地板（DESIGN.md §1/§7 对比度）。
  const preset = ACCENT_PRESETS.find(a => a.id === resolveAccentId(accent))
  let hex = type === 'dark' && preset ? preset.dark : resolveAccent(accent)
  if (type === 'dark') {
    hex = ensureDarkAccent(hex)
  }
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
  if (!accent) return 'cyan'
  const trimmed = accent.trim()
  if (trimmed.startsWith('#')) {
    return ACCENT_PRESETS.find(a => a.color.toLowerCase() === trimmed.toLowerCase())?.id ?? 'cyan'
  }
  return trimmed
}

export function useTheme() {
  const theme = useSettingsStore(s => s.theme)
  const accentColor = useSettingsStore(s => s.accentColor)
  const typographyTheme = useSettingsStore(s => s.typographyTheme || DEFAULT_TYPOGRAPHY_THEME)
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
