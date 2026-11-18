// 排版主题门面 — 由 ACKS 43 款主题派生（Task 5：删 13 款手写主题，改走 ACKS 引擎）。
// 每套主题控制：标题装饰、引用样式、代码块、表格、链接等文章内容呈现。
// 主题 CSS 由 buildTypographyTheme 生成，直接以裸宿主选择器（.lz-editor-content / .read-article-body /
// .preview-doc / .export-preview-body）作用域，不依赖根 [data-typography-theme] 属性做 CSS 门控；
// 根属性仅作为“当前主题 id”的语义标记（写入解析后的 ACKS id，旧 id 回退 DEFAULT_TYPOGRAPHY_THEME）。
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
  // 根属性写入解析后的主题 id（ACKS id）：旧 id（如 night）会回退到 graphite，注入的 CSS 与属性必须一致，
  // 否则 globals.css 里的 [data-typography-theme="night"] 规则会与 graphite 文章错配。
  root.setAttribute('data-typography-theme', theme?.id ?? DEFAULT_TYPOGRAPHY_THEME)

  let styleEl = document.getElementById('lz-typography-theme-css') as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'lz-typography-theme-css'
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = theme?.css ?? ''
}
