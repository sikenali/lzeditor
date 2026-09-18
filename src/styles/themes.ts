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

export interface HeadingStyleConfig {
  h1?: 'default' | 'color-only' | 'border-bottom' | 'border-left'
  h2?: 'default' | 'color-only' | 'border-bottom' | 'border-left'
  h3?: 'default' | 'color-only' | 'border-bottom' | 'border-left'
  h4?: 'default' | 'color-only' | 'border-bottom' | 'border-left'
  h5?: 'default' | 'color-only' | 'border-bottom' | 'border-left'
  h6?: 'default' | 'color-only' | 'border-bottom' | 'border-left'
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

// ── Dynamic typography CSS injection (doocs/md inspired) ──

const HEADING_FONT_SIZES: Record<string, number> = { h1: 28, h2: 22, h3: 18, h4: 16, h5: 15, h6: 14 }
const HEADING_FONT_SIZES_PX = (level: string, baseSize: number): string => {
  const ratio = HEADING_FONT_SIZES[level] || 16
  return `${Math.round(ratio / 17 * baseSize)}px`
}

export interface TypographyOverrides {
  fontSize?: number
  lineHeight?: string
  fontFamily?: string
  contentWidth?: string
  textIndent?: boolean
  textJustify?: boolean
  linkColor?: string
  blockquoteBackground?: string
  headingStyles?: Record<string, string>
}

let _injectorEl: HTMLStyleElement | null = null

function getInjector(): HTMLStyleElement {
  if (!_injectorEl) {
    _injectorEl = document.createElement('style')
    _injectorEl.setAttribute('data-lzeditor-typo', 'true')
    document.head.appendChild(_injectorEl)
  }
  return _injectorEl
}

/**
 * Apply dynamic typography overrides directly to :root CSS variables
 * and inject heading/text rules into a dedicated <style> element.
 * This is called whenever font/line-height/heading settings change.
 */
export function applyTypographyOverrides(overrides: TypographyOverrides): void {
  const root = document.documentElement
  const {
    fontSize,
    lineHeight,
    fontFamily,
    contentWidth,
    textIndent,
    textJustify,
    linkColor,
    blockquoteBackground,
    headingStyles,
  } = overrides

  // Update CSS custom properties on :root
  if (fontSize !== undefined)
    root.style.setProperty('--lz-font-size', `${fontSize}px`)
  if (lineHeight !== undefined)
    root.style.setProperty('--lz-line-height', lineHeight)
  if (fontFamily !== undefined)
    root.style.setProperty('--lz-font-family', fontFamily)
  if (contentWidth !== undefined)
    root.style.setProperty('--lz-content-width', `${contentWidth}px`)
  if (linkColor !== undefined)
    root.style.setProperty('--lz-link-color', linkColor)
  if (blockquoteBackground !== undefined)
    root.style.setProperty('--lz-blockquote-bg', blockquoteBackground)

  // Build dynamic CSS rules
  const baseSize = fontSize ?? 17
  const lines: string[] = []

  // Base reading font
  if (fontFamily)
    lines.push(`:root { --lz-body-font: ${fontFamily}; }`)

  // Link color
  if (linkColor)
    lines.push(`:root { --lz-link-color: ${linkColor}; }`)
  lines.push(`#output a, .read-article-body a { color: var(--lz-link-color, var(--accent-primary)); }`)

  // Blockquote background
  if (blockquoteBackground)
    lines.push(`#output blockquote, .read-article-body blockquote { background: var(--lz-blockquote-bg, var(--accent-a10)); }`)

  // Text indentation & justification
  const pAlign = `${textIndent ? 'text-indent:2em;' : ''} ${textJustify ? 'text-align:justify;' : ''}`.trim()
  if (pAlign)
    lines.push(`#output p, .read-article-body p { ${pAlign} }`)

  // Heading styles
  if (headingStyles) {
    for (const [level, style] of Object.entries(headingStyles)) {
      if (!style || style === 'default') continue
      const size = HEADING_FONT_SIZES_PX(level, baseSize)
      if (style === 'color-only') {
        lines.push(`#output ${level}, .read-article-body ${level} { color: var(--accent-primary); background: transparent; }`)
      } else if (style === 'border-bottom') {
        lines.push(`#output ${level}, .read-article-body ${level} { display:block; text-align:left; background:transparent; padding-bottom:0.3em; border-bottom:2px solid var(--accent-primary); color:var(--accent-primary); font-size:${size}; }`)
      } else if (style === 'border-left') {
        lines.push(`#output ${level}, .read-article-body ${level} { display:block; text-align:left; margin-left:0; padding-left:10px; border-left:4px solid var(--accent-primary); color:var(--accent-primary); background:transparent; font-size:${size}; }`)
      }
    }
  }

  // Apply
  const injector = getInjector()
  injector.textContent = lines.join('\n')
}

/** Clear all dynamically injected typography rules. */
export function clearTypographyOverrides(): void {
  if (_injectorEl) {
    _injectorEl.textContent = ''
  }
}
