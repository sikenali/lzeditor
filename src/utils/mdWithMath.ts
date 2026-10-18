import katex from 'katex'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import { sanitizeHtml } from './sanitizeHtml'

/**
 * 将 markdown 中的 $...$ / $$...$$ 提取为占位符，
 * 经过 remark 处理后，再将占位符替换为 katex 渲染的 HTML。
 */
export function renderMdWithMath(md: string): string {
  if (!md) return ''
  const inlineMATH: string[] = []
  const displayMATH: string[] = []

  // 提取行内公式 $...$（不含换行）
  let processed = md.replace(/\$([^\$\n]+?)\$/g, (_, formula) => {
    const idx = inlineMATH.length
    inlineMATH.push(sanitizeFormula(formula.trim()))
    return placeholder('I', idx)
  })

  // 提取独立公式 $$...$$（支持多行）
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
    const idx = displayMATH.length
    displayMATH.push(sanitizeFormula(formula.trim()))
    return placeholder('D', idx)
  })

  let html: string
  try {
    // 先消毒再插公式：remark-html 会把 markdown 里的原始 HTML 原样带出来，
    // 而 katex 的输出是代码生成的、可信，放在消毒之后不会被过滤掉
    html = sanitizeHtml(
      remark().use(remarkGfm).use(remarkHtml).processSync(processed).toString()
    )
  } catch {
    html = processed
  }

  // 替换行内公式
  inlineMATH.forEach((formula, i) => {
    try {
      html = html.split(placeholder('I', i)).join(
        katex.renderToString(formula, { throwOnError: false, displayMode: false })
      )
    } catch {
      html = html.split(placeholder('I', i)).join(`<code>${formula}</code>`)
    }
  })

  // 替换独立公式
  displayMATH.forEach((formula, i) => {
    try {
      html = html.split(placeholder('D', i)).join(
        katex.renderToString(formula, { throwOnError: false, displayMode: true })
      )
    } catch {
      html = html.split(placeholder('D', i)).join(`<pre><code>${formula}</code></pre>`)
    }
  })

  return html
}

/**
 * 占位符用 Unicode 私有区字符包裹。
 *
 * 之前用的是 `__INLINE_0__`：连续下划线会被 remark-gfm 当成加粗语法，
 * 占位符被渲染成 <strong>INLINE_0</strong>，于是后面的
 * split('__INLINE_0__') 永远匹配不到，行内公式实际上从来没有被替换成公式。
 * 私有区字符不可能出现在用户文本里，也不带任何 markdown 语义。
 */
const PLACEHOLDER_MARK = '\uE000'
function placeholder(kind: 'I' | 'D', idx: number): string {
  return `${PLACEHOLDER_MARK}${kind}${idx}${PLACEHOLDER_MARK}`
}

/** 清理公式中 LaTeX 不兼容的语法，消除 strict mode 警告 */
function sanitizeFormula(formula: string): string {
  return formula
    .replace(/\\newline/g, '\\\\')
    .replace(/\\\\$/gm, '')
    .replace(/\n/g, '\\\\')
}
