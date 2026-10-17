// Minimal themes module — article content styling now lives in typography-themes.ts.
// This file is kept for backward-compat utility functions.

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

/**
 * Colour theme system (bid-maker DESIGN.md §5).
 * Source of truth for the `--color-*` token values written inline on <html> by
 * `applyTheme()` in hooks/useTheme.ts.
 */
export type ThemeType = 'parchment' | 'dark'

export const themeTokens: Record<ThemeType, Record<string, string>> = {
  parchment: {
    '--color-primary': '#C0392B',
    '--color-primary-soft': '#FBE9E7',
    '--color-bg-main': '#FAF7F2',
    '--color-bg-secondary': '#F7F3EA',
    '--color-bg-card': '#FCFBF8',
    '--color-bg-white': '#FFFFFF',
    '--color-text-primary': '#1F1D1A',
    '--color-text-body': '#3A3A3A',
    '--color-text-secondary': '#6E6A60',
    '--color-text-muted': '#8A8578',
    '--color-text-faint': '#A7A296',
    '--color-border': '#E5DFD3',
    '--color-border-soft': '#EDE9E0',
    '--color-border-hover': '#D9D2C2',
    '--color-success': '#4E9B7A',
    '--color-success-strong': '#3E8A6B',
    '--color-success-soft': '#E4F0EA',
    '--color-info': '#4A72A8',
    '--color-info-soft': '#E8F0F8',
    '--color-warning': '#F39C12',
    '--color-warning-soft': '#FEF5E7',
    '--color-error': '#E74C3C',
    '--color-error-soft': '#FADCDA',
  },
  dark: {
    '--color-primary': '#E05050',
    '--color-primary-soft': '#3A2323',
    '--color-bg-main': '#17171A',
    '--color-bg-secondary': '#1C1C1F',
    '--color-bg-card': '#232324',
    '--color-bg-white': '#232324',
    '--color-text-primary': '#F2F3F5',
    '--color-text-body': '#DDE0E6',
    '--color-text-secondary': '#C9CDD4',
    '--color-text-muted': '#A7AEB9',
    '--color-text-faint': '#86909C',
    '--color-border': '#2A2B2E',
    '--color-border-soft': '#2A2B2E',
    '--color-border-hover': '#3A3B3F',
    '--color-success': '#5CB98C',
    '--color-success-strong': '#7BC8A4',
    '--color-success-soft': '#1D3329',
    '--color-info': '#82AEDD',
    '--color-info-soft': '#1B2A3A',
    '--color-warning': '#F2B23E',
    '--color-warning-soft': '#38300F',
    '--color-error': '#E86A5A',
    '--color-error-soft': '#3A2326',
  },
}

export const ACCENT_PRESETS: { id: string; name: string; color: string }[] = [
  { id: 'vermilion', name: '朱红', color: '#BE3B2E' },
  { id: 'gold', name: '鎏金', color: '#D3A93F' },
  { id: 'jade', name: '玉绿', color: '#3E8C6E' },
  { id: 'cloud', name: '云蓝', color: '#4A72A8' },
  { id: 'ink', name: '黛墨', color: '#2F3640' },
]
