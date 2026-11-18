// 纯映射函数：ACKS 主题对象 → LZ 宿主 CSS / 导出 token / TypographyTheme / 卡片缩略图元数据。
// 该文件不 import 引擎、PNG 资产或 DOM——只做纯数据转换，供 Task 5/6/8 消费。

export const DEFAULT_TYPOGRAPHY_THEME = 'graphite'
export const LZ_HOST_SELECTORS = ['.preview-doc', '.read-article-body', '.export-preview-body', '.lz-editor-content']

export interface AcksTheme {
  id: string
  name: string
  bg: string
  text: string
  heading: string
  accent: string
  accent2: string
  emphasis: string
  sectionHeading: string
  titleText: string
  titleBg: string
  thBg: string
  thText: string
  quoteBg: string
  quoteText: string
  quoteBorder: string
  codeBg: string
  codeText: string
  codeBlockBg: string
  codeBlockText: string
  zebra: string
  bodySize: number
  lineHeight: number
  letterSpacing: number
  h1: number
  h2: number
  h3: number
  h4: number
  fontFamily: string
  headingFamily: string
  milestoneKey: string | null
  milestoneVariant?: string
  themeVersion?: number
  editorialProfile?: string
  signature?: string | null
}

export interface ExportThemeTokens {
  overlay: string
  primary: string
  text: string
  muted: string
  heading: string
  code: string
  border: string
  amber: string
}

export interface TypographyTheme {
  id: string
  name: string
  color: string
  tag: string
  css: string
}

/** 线性混色：`c1*(1-k) + c2*k`，hex→hex。支持 #RGB 与 #RRGGBB。 */
function mix(c1: string, c2: string, k: number): string {
  const parse = (hex: string): [number, number, number] => {
    let h = hex.replace(/^#/, '')
    if (h.length === 3) h = h.split('').map((ch) => ch + ch).join('')
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const [r1, g1, b1] = parse(c1)
  const [r2, g2, b2] = parse(c2)
  const ch = (a: number, b: number) => Math.round(a * (1 - k) + b * k).toString(16).padStart(2, '0')
  return `#${ch(r1, r2)}${ch(g1, g2)}${ch(b1, b2)}`
}

// 由 ACKS token 派生结构化导出变量（对应原 exportService 的 TYPOGRAPHY_THEME_VARS 形状）
export function acksThemeToLzTokens(t: AcksTheme): ExportThemeTokens {
  return {
    primary: t.accent,
    text: t.text,
    heading: t.heading,
    code: t.codeText,
    border: mix(t.bg, t.text, 0.19),
    muted: t.quoteText,
    overlay: mix(t.bg, t.accent, 0.12),
    amber: t.accent,
  }
}

// 由 ACKS token 生成 LZ 宿主通用 CSS（作用域 = hostSelector，仅颜色/字号/字体）
export function acksThemeToLzCss(t: AcksTheme, hostSelector: string): string {
  return [
    `${hostSelector}{color:${t.text};font-family:${t.fontFamily};line-height:${t.lineHeight};letter-spacing:${t.letterSpacing}px}`,
    `${hostSelector} h1{color:${t.heading};font-size:${t.h1}px;font-family:${t.headingFamily}}`,
    `${hostSelector} h2{color:${t.sectionHeading};font-size:${t.h2}px;font-family:${t.headingFamily}}`,
    `${hostSelector} h3{color:${t.heading};font-size:${t.h3}px}`,
    `${hostSelector} h4{color:${t.heading};font-size:${t.h4}px}`,
    `${hostSelector} blockquote{border-color:${t.quoteBorder};color:${t.quoteText};background:${t.quoteBg}}`,
    `${hostSelector} code{background:${t.codeBg};color:${t.codeText}}`,
    `${hostSelector} pre{background:${t.codeBlockBg};color:${t.codeBlockText}}`,
    `${hostSelector} th{background:${t.thBg};color:${t.thText}}`,
    `${hostSelector} table tbody tr:nth-child(even){background:${t.zebra}}`,
  ].join('\n')
}

export function buildTypographyTheme(t: AcksTheme): TypographyTheme {
  return { id: t.id, name: t.name, color: t.accent, tag: '', css: LZ_HOST_SELECTORS.map((s) => acksThemeToLzCss(t, s)).join('\n') }
}

export function acksThemeCardMeta(t: AcksTheme): { name: string; color: string; bg: string; text: string } {
  return { name: t.name, color: t.accent, bg: t.bg, text: t.text }
}
