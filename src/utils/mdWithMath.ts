import katex from 'katex'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'

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
    inlineMATH.push(formula.trim())
    return `__INLINE_${idx}__`
  })

  // 提取独立公式 $$...$$（支持多行）
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => {
    const idx = displayMATH.length
    displayMATH.push(formula.trim())
    return `__DISPLAY_${idx}__`
  })

  let html: string
  try {
    html = remark().use(remarkGfm).use(remarkHtml).processSync(processed).toString()
  } catch {
    html = processed
  }

  // 替换行内公式
  inlineMATH.forEach((formula, i) => {
    try {
      html = html.split(`__INLINE_${i}__`).join(
        katex.renderToString(formula, { throwOnError: false, displayMode: false })
      )
    } catch {
      html = html.split(`__INLINE_${i}__`).join(`<code>${formula}</code>`)
    }
  })

  // 替换独立公式
  displayMATH.forEach((formula, i) => {
    try {
      html = html.split(`__DISPLAY_${i}__`).join(
        katex.renderToString(formula, { throwOnError: false, displayMode: true })
      )
    } catch {
      html = html.split(`__DISPLAY_${i}__`).join(`<pre><code>${formula}</code></pre>`)
    }
  })

  return html
}
