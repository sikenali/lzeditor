// 6 visual style sets — applied via data-style-set attribute on <html>
// Each set defines a full color palette (see color-tokens.css [data-style-set="..."]).
export interface StyleSet {
  name: string        // display name in Chinese
  id: string          // matches CSS [data-style-set="id"]
  mode: 'dark' | 'light'
  preview: {
    bg: string        // background color for preview swatch
    accent: string    // accent color for preview swatch
  }
}

export const STYLE_SETS: StyleSet[] = [
  {
    name: '深海', id: 'ocean', mode: 'dark',
    preview: { bg: '#0c1826', accent: '#4fc3f7' },
  },
  {
    name: '暗夜', id: 'neon-dark', mode: 'dark',
    preview: { bg: '#12181f', accent: '#39ff9e' },
  },
  {
    name: '石墨', id: 'graphite', mode: 'dark',
    preview: { bg: '#282828', accent: '#ff9800' },
  },
  {
    name: '樱花', id: 'sakura', mode: 'light',
    preview: { bg: '#fff0f5', accent: '#f48fab' },
  },
  {
    name: '薄荷', id: 'mint', mode: 'light',
    preview: { bg: '#c8e6cb', accent: '#4caf50' },
  },
  {
    name: '极简', id: 'minimal', mode: 'light',
    preview: { bg: '#fafafa', accent: '#2196f3' },
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
