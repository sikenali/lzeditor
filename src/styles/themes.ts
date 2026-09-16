// Theme definitions for lzeditor
export interface Theme {
  name: string
  id: string
  colors: {
    bgPrimary: string
    bgSecondary: string
    bgTertiary: string
    bgCode: string
    textPrimary: string
    textSecondary: string
    textMuted: string
    accentPrimary: string
    accentSoft: string
    accentBorder: string
    borderDefault: string
    borderSubtle: string
    amber: string
  }
}

export const THEMES: Theme[] = [
  {
    name: '暗夜霓虹',
    id: 'neon-dark',
    colors: {
      bgPrimary: 'rgba(10, 14, 19, 1)',
      bgSecondary: 'rgba(18, 24, 31, 1)',
      bgTertiary: 'rgba(13, 19, 25, 1)',
      bgCode: 'rgba(15, 22, 32, 1)',
      textPrimary: 'rgba(220, 230, 240, 1)',
      textSecondary: 'rgba(125, 139, 153, 1)',
      textMuted: 'rgba(95, 110, 125, 1)',
      accentPrimary: 'rgba(57, 255, 158, 1)',
      accentSoft: 'rgba(57, 255, 158, 0.15)',
      accentBorder: 'rgba(57, 255, 158, 0.2)',
      borderDefault: 'rgba(51, 64, 76, 1)',
      borderSubtle: 'rgba(29, 39, 49, 1)',
      amber: 'rgba(255, 228, 92, 1)',
    }
  },
  {
    name: '深海',
    id: 'ocean',
    colors: {
      bgPrimary: 'rgba(8, 18, 28, 1)',
      bgSecondary: 'rgba(12, 24, 38, 1)',
      bgTertiary: 'rgba(10, 20, 32, 1)',
      bgCode: 'rgba(14, 26, 40, 1)',
      textPrimary: 'rgba(224, 235, 255, 1)',
      textSecondary: 'rgba(150, 175, 200, 1)',
      textMuted: 'rgba(100, 125, 150, 1)',
      accentPrimary: 'rgba(79, 195, 247, 1)',
      accentSoft: 'rgba(79, 195, 247, 0.15)',
      accentBorder: 'rgba(79, 195, 247, 0.2)',
      borderDefault: 'rgba(40, 60, 80, 1)',
      borderSubtle: 'rgba(25, 40, 55, 1)',
      amber: 'rgba(255, 183, 77, 1)',
    }
  },
  {
    name: '樱花',
    id: 'sakura',
    colors: {
      bgPrimary: 'rgba(255, 248, 250, 1)',
      bgSecondary: 'rgba(255, 240, 245, 1)',
      bgTertiary: 'rgba(255, 235, 245, 1)',
      bgCode: 'rgba(252, 228, 236, 1)',
      textPrimary: 'rgba(60, 20, 40, 1)',
      textSecondary: 'rgba(120, 70, 90, 1)',
      textMuted: 'rgba(160, 120, 140, 1)',
      accentPrimary: 'rgba(244, 143, 177, 1)',
      accentSoft: 'rgba(244, 143, 177, 0.15)',
      accentBorder: 'rgba(244, 143, 177, 0.3)',
      borderDefault: 'rgba(248, 187, 200, 1)',
      borderSubtle: 'rgba(250, 215, 225, 1)',
      amber: 'rgba(255, 138, 101, 1)',
    }
  },
  {
    name: '石墨',
    id: 'graphite',
    colors: {
      bgPrimary: 'rgba(30, 30, 30, 1)',
      bgSecondary: 'rgba(40, 40, 40, 1)',
      bgTertiary: 'rgba(35, 35, 35, 1)',
      bgCode: 'rgba(45, 45, 45, 1)',
      textPrimary: 'rgba(240, 240, 240, 1)',
      textSecondary: 'rgba(180, 180, 180, 1)',
      textMuted: 'rgba(120, 120, 120, 1)',
      accentPrimary: 'rgba(255, 152, 0, 1)',
      accentSoft: 'rgba(255, 152, 0, 0.15)',
      accentBorder: 'rgba(255, 152, 0, 0.2)',
      borderDefault: 'rgba(60, 60, 60, 1)',
      borderSubtle: 'rgba(50, 50, 50, 1)',
      amber: 'rgba(255, 193, 7, 1)',
    }
  },
  {
    name: '薄荷',
    id: 'mint',
    colors: {
      bgPrimary: 'rgba(232, 245, 233, 1)',
      bgSecondary: 'rgba(200, 230, 203, 1)',
      bgTertiary: 'rgba(220, 238, 221, 1)',
      bgCode: 'rgba(200, 230, 203, 1)',
      textPrimary: 'rgba(20, 50, 30, 1)',
      textSecondary: 'rgba(60, 100, 70, 1)',
      textMuted: 'rgba(100, 130, 110, 1)',
      accentPrimary: 'rgba(76, 175, 80, 1)',
      accentSoft: 'rgba(76, 175, 80, 0.15)',
      accentBorder: 'rgba(76, 175, 80, 0.3)',
      borderDefault: 'rgba(165, 214, 167, 1)',
      borderSubtle: 'rgba(185, 222, 187, 1)',
      amber: 'rgba(255, 193, 7, 1)',
    }
  },
  {
    name: '极简白',
    id: 'minimal-white',
    colors: {
      bgPrimary: 'rgba(255, 255, 255, 1)',
      bgSecondary: 'rgba(250, 250, 250, 1)',
      bgTertiary: 'rgba(245, 245, 245, 1)',
      bgCode: 'rgba(245, 245, 245, 1)',
      textPrimary: 'rgba(30, 30, 30, 1)',
      textSecondary: 'rgba(80, 80, 80, 1)',
      textMuted: 'rgba(140, 140, 140, 1)',
      accentPrimary: 'rgba(33, 150, 243, 1)',
      accentSoft: 'rgba(33, 150, 243, 0.1)',
      accentBorder: 'rgba(33, 150, 243, 0.3)',
      borderDefault: 'rgba(224, 224, 224, 1)',
      borderSubtle: 'rgba(240, 240, 240, 1)',
      amber: 'rgba(255, 152, 0, 1)',
    }
  },
]

export function applyTheme(themeId: string): void {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0]
  const root = document.documentElement
  const c = theme.colors
  
  root.style.setProperty('--bg-primary', c.bgPrimary)
  root.style.setProperty('--bg-secondary', c.bgSecondary)
  root.style.setProperty('--bg-tertiary', c.bgTertiary)
  root.style.setProperty('--bg-code', c.bgCode)
  root.style.setProperty('--text-primary', c.textPrimary)
  root.style.setProperty('--text-secondary', c.textSecondary)
  root.style.setProperty('--text-muted', c.textMuted)
  root.style.setProperty('--accent-primary', c.accentPrimary)
  root.style.setProperty('--accent-soft', c.accentSoft)
  root.style.setProperty('--accent-border', c.accentBorder)
  root.style.setProperty('--border-default', c.borderDefault)
  root.style.setProperty('--border-subtle', c.borderSubtle)
  root.style.setProperty('--amber', c.amber)
}

export function getCurrentTheme(): Theme {
  return THEMES[0]
}
