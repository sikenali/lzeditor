// 排版主题门面 — 由 ACKS 43 款主题派生（Task 5：删 13 款手写主题，改走 ACKS 引擎）。
// 每套主题控制：标题装饰、引用样式、代码块、表格、链接等文章内容呈现。
// 通过 [data-typography-theme="xxx"] 根选择器，作用域覆盖编辑器内容区、预览区、阅读模式。
// TypographyTheme 从 acks-mapping 再导出，保持既有消费方签名。

import { getAcksTheme, ACKS_THEME_IDS } from './acks-themes'
import { buildTypographyTheme, DEFAULT_TYPOGRAPHY_THEME, type TypographyTheme } from './acks-mapping'

export type { TypographyTheme } from './acks-mapping'

export const TYPOGRAPHY_THEMES: TypographyTheme[] =
  ACKS_THEME_IDS.map(id => buildTypographyTheme(getAcksTheme(id)!))

export function getTypographyTheme(id: string): TypographyTheme | undefined {
  const t = getAcksTheme(id) ?? getAcksTheme(DEFAULT_TYPOGRAPHY_THEME)
  return t ? buildTypographyTheme(t) : undefined
}

/**
 * Apply a typography theme by injecting / updating a <style> tag in document.head.
 * Also sets data-typography-theme attribute on root for CSS cascade.
 */
export function applyTypographyTheme(themeId: string): void {
  const theme = getTypographyTheme(themeId)
  const root = document.documentElement
  root.setAttribute('data-typography-theme', themeId)

  let styleEl = document.getElementById('lz-typography-theme-css') as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'lz-typography-theme-css'
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = theme?.css ?? ''
}
