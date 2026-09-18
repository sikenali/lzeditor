// 6 visual style sets — applied via data-style-set attribute on <html>
// Each set defines a full color palette (see color-tokens.css [data-style-set="..."]).
export interface StyleSetColors {
  accent: string
  foreground: string
  foregroundSecondary: string
  foregroundMuted: string
  foregroundHeading: string
  background: string
  backgroundCard: string
  backgroundMuted: string
  backgroundHover: string
  backgroundCode: string
  borderDefault: string
  borderSubtle: string
  amber: string
}

export interface StyleSet {
  name: string        // display name in Chinese
  id: string          // matches CSS [data-style-set="id"]
  mode: 'dark' | 'light'
  preview: {
    bg: string        // background color for preview swatch
    accent: string    // accent color for preview swatch
  }
  colors: StyleSetColors
}

const rgba = (hex: string, opacity: number): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${opacity})`
}

const ACCENT_OPA = (accent: string) => ({
  a5: rgba(accent, 0.05),
  a10: rgba(accent, 0.10),
  a15: rgba(accent, 0.15),
  a30: rgba(accent, 0.30),
  a40: rgba(accent, 0.40),
})

export const STYLE_SETS: StyleSet[] = [
  // dark themes
  {
    name: '深海', id: 'ocean', mode: 'dark',
    preview: { bg: '#0c1826', accent: '#4fc3f7' },
    colors: {
      accent: '#4fc3f7',
      foreground: '#e0ebff',
      foregroundSecondary: '#96afc8',
      foregroundMuted: '#647d96',
      foregroundHeading: '#e0efff',
      background: '#08121c',
      backgroundCard: '#0c1826',
      backgroundMuted: '#0a1420',
      backgroundHover: '#122030',
      backgroundCode: '#0e1a28',
      borderDefault: '#283c50',
      borderSubtle: '#192837',
      amber: '#c9a96e',
    },
  },
  {
    name: '暗夜', id: 'neon-dark', mode: 'dark',
    preview: { bg: '#12181f', accent: '#39ff9e' },
    colors: {
      accent: '#39ff9e',
      foreground: '#e0f5e8',
      foregroundSecondary: '#8fbfa8',
      foregroundMuted: '#5a8a70',
      foregroundHeading: '#e8fff0',
      background: '#0e1418',
      backgroundCard: '#12181f',
      backgroundMuted: '#0e1418',
      backgroundHover: '#1a2430',
      backgroundCode: '#0e1418',
      borderDefault: '#2a3a30',
      borderSubtle: '#1a2420',
      amber: '#c9a96e',
    },
  },
  {
    name: '石墨', id: 'graphite', mode: 'dark',
    preview: { bg: '#282828', accent: '#ff9800' },
    colors: {
      accent: '#ff9800',
      foreground: '#f0e6d6',
      foregroundSecondary: '#b0a090',
      foregroundMuted: '#706858',
      foregroundHeading: '#f8f0e0',
      background: '#1e1e1e',
      backgroundCard: '#282828',
      backgroundMuted: '#222222',
      backgroundHover: '#323232',
      backgroundCode: '#242424',
      borderDefault: '#3a3a3a',
      borderSubtle: '#2e2e2e',
      amber: '#d4a050',
    },
  },
  // light themes
  {
    name: '樱花', id: 'sakura', mode: 'light',
    preview: { bg: '#fff0f5', accent: '#f48fab' },
    colors: {
      accent: '#f48fab',
      foreground: '#4a3040',
      foregroundSecondary: '#7a5a6a',
      foregroundMuted: '#a08090',
      foregroundHeading: '#3a2030',
      background: '#fff8fa',
      backgroundCard: '#ffffff',
      backgroundMuted: '#fdf0f5',
      backgroundHover: '#fff0f5',
      backgroundCode: '#fff5f8',
      borderDefault: '#f0d0dc',
      borderSubtle: '#f8e8ee',
      amber: '#c9a96e',
    },
  },
  {
    name: '薄荷', id: 'mint', mode: 'light',
    preview: { bg: '#c8e6cb', accent: '#4caf50' },
    colors: {
      accent: '#4caf50',
      foreground: '#2a3a2a',
      foregroundSecondary: '#5a7a5a',
      foregroundMuted: '#8aaa8a',
      foregroundHeading: '#1e2e1e',
      background: '#f5faf5',
      backgroundCard: '#ffffff',
      backgroundMuted: '#eef5ee',
      backgroundHover: '#e8f5e8',
      backgroundCode: '#f0f8f0',
      borderDefault: '#c8e0c8',
      borderSubtle: '#e0f0e0',
      amber: '#c9a96e',
    },
  },
  {
    name: '极简', id: 'minimal', mode: 'light',
    preview: { bg: '#fafafa', accent: '#2196f3' },
    colors: {
      accent: '#2196f3',
      foreground: '#1e1e1e',
      foregroundSecondary: '#505050',
      foregroundMuted: '#8c8c8c',
      foregroundHeading: '#1e1e1e',
      background: '#ffffff',
      backgroundCard: '#fafafa',
      backgroundMuted: '#f5f5f5',
      backgroundHover: '#f0f0f0',
      backgroundCode: '#f5f5f5',
      borderDefault: '#e0e0e0',
      borderSubtle: '#ececec',
      amber: '#ff9800',
    },
  },
]

/** Apply a style set by setting data-style-set on root. */
export function applyStyleSet(styleSetId: string): void {
  document.documentElement.setAttribute('data-style-set', styleSetId)
}

/** Get the currently active style set name (empty if none). */
export function getActiveStyleSetName(): string {
  return document.documentElement.getAttribute('data-style-set') ?? ''
}

export interface TypographyOverrides {
  fontSize?: number
  lineHeight?: string
  fontFamily?: string
  contentWidth?: string
  textIndent?: boolean
  textJustify?: boolean
  headingStyles?: Record<string, string>
}

/** Apply typography overrides to :root CSS variables for read-mode / preview areas. */
export function applyTypographyOverrides(opts: TypographyOverrides): void {
  const root = document.documentElement
  if (opts.fontSize) root.style.setProperty('--read-font-size', `${opts.fontSize}px`)
  else root.style.removeProperty('--read-font-size')
  if (opts.lineHeight) root.style.setProperty('--read-line-height', opts.lineHeight)
  else root.style.removeProperty('--read-line-height')
  if (opts.fontFamily) root.style.setProperty('--read-font-family', opts.fontFamily)
  else root.style.removeProperty('--read-font-family')
  if (opts.textIndent) root.style.setProperty('--read-text-indent', '2em')
  else root.style.removeProperty('--read-text-indent')
  if (opts.textJustify) root.style.setProperty('--read-text-align', 'justify')
  else root.style.removeProperty('--read-text-align')
  if (opts.headingStyles) {
    Object.entries(opts.headingStyles).forEach(([level, style]) => {
      if (style === 'default' || !style) root.style.removeProperty(`--heading-${level}`)
      else root.style.setProperty(`--heading-${level}`, style)
    })
  }
}
