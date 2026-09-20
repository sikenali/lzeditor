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
