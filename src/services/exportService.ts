import { silentError } from '../utils/silentError'
import { getCodeTheme } from '../styles/code-themes'
import { acksThemeToLzTokens, DEFAULT_TYPOGRAPHY_THEME } from '../styles/acks-mapping'
import { getAcksTheme } from '../styles/acks-themes'
import { renderMermaidBlocks } from '../utils/markdown/mermaid'
import { renderEchartsBlocks } from '../utils/markdown/echarts'
export interface ExportOptions {
  title: string
  author?: string
  content: string
  format: 'pdf' | 'html' | 'docx' | 'epub' | 'md' | 'png' | 'svg' | 'drawio' | 'xlsx'
  options?: {
    typographyTheme?: string
    codeTheme?: string
    macCodeBlock?: boolean
    includeTOC?: boolean
    includeLineNumbers?: boolean
    includePageNumbers?: boolean
    paperSize?: string
    orientation?: string
    // ── Typography ──
    fontSize?: number
    lineHeight?: string
    fontFamily?: string
    textIndent?: boolean
    textJustify?: boolean
    linkColor?: string
    blockquoteBackground?: string
    headingStyles?: Record<string, string>
  }
}

const PAPER_SIZES: Record<string, string> = {
  a4: '210mm', a3: '297mm', a5: '148mm', letter: '216mm', legal: '216mm',
}
const PAPER_HEIGHTS: Record<string, string> = {
  a4: '297mm', a3: '420mm', a5: '210mm', letter: '279mm', legal: '356mm',
}

// 导出件是独立文档，吃不到应用里的 --font-* 变量，必须用展开后的真实字体栈。
// 与应用内默认栈保持一致（color-tokens.css 的 --font-sans）。
const DEFAULT_EXPORT_FONT = '"Inter","Noto Sans SC","PingFang SC","Microsoft YaHei",system-ui,sans-serif'

/**
 * Loads the highlight.js theme CSS for the chosen code theme, so exported
 * code blocks keep their syntax colours (the app's own CSS is not in the
 * export document). Returns '' on failure so export never breaks on it.
 */
async function loadCodeThemeCSS(codeTheme: string): Promise<string> {
  const theme = getCodeTheme(codeTheme || 'atom-one-dark')
  try {
    const mod: any = await import(/* @vite-ignore */ `highlight.js/styles/${theme.file}.css`)
    return mod.default || ''
  } catch {
    return ''
  }
}

/** Mac 窗口装饰（红黄绿三个圆点）的 CSS，挂在 `.mac-code pre` 上。 */
function macCodeCSS(macBg: string): string {
  return `
    .mac-code pre { position: relative; padding-top: 36px; }
    .mac-code pre::before { content:''; position:absolute; top:0; left:0; right:0; height:24px; background:${macBg}; border-radius:8px 8px 0 0; }
    .mac-code pre::after { content:''; position:absolute; top:8px; left:10px; width:38px; height:12px; background-image:radial-gradient(circle,#ff5f56 0 4px,transparent 4.5px),radial-gradient(circle,#ffbd2e 0 4px,transparent 4.5px),radial-gradient(circle,#27c93f 0 4px,transparent 4.5px); background-position:0 0,14px 0,28px 0; background-size:12px 12px; background-repeat:no-repeat; }
  `
}


const themeFor = (id: string) => getAcksTheme(id) ?? getAcksTheme(DEFAULT_TYPOGRAPHY_THEME)!

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function getCSSVars(typographyThemeId: string): string {
  const v = acksThemeToLzTokens(themeFor(typographyThemeId))
  const rgb = hexToRgb(v.primary)
  return [
    `--accent-primary: ${v.primary};`,
    `--accent-a5: rgba(${rgb},0.05);`,
    `--accent-a10: rgba(${rgb},0.10);`,
    `--accent-a15: rgba(${rgb},0.15);`,
    `--accent-a30: rgba(${rgb},0.30);`,
    `--accent-a40: rgba(${rgb},0.40);`,
    `--text-primary: ${v.text};`,
    `--text-secondary: ${v.muted};`,
    `--text-muted: ${v.muted};`,
    `--text-heading: ${v.heading};`,
    `--text-heading-2: ${v.heading};`,
    `--bg-code: ${v.code};`,
    `--bg-overlay: ${v.overlay};`,
    `--border-default: ${v.border};`,
    `--border-subtle: ${v.border};`,
    `--border-lighter: ${v.border};`,
    `--amber: ${v.amber};`,
    `--success-bg: ${v.code};`,
    `--success-border: ${v.border};`,
    `--red-soft: rgba(200,50,50,0.1);`,
    `--red-text: #c43d3d;`,
  ].join('\n')
}

function buildTOC(html: string): string {
  const headings: { level: number; text: string; id: string }[] = []
  const re = /<(h[1-6])([^>]*)>([\s\S]*?)<\/\1>/gi
  // 给标题注入/复用 id，目录链接必须指向正文真实锚点；之前生成的 `#toc-N`
  // 与渲染器的 headingIdGen 不一致，所有目录链接都是死链。
  const withIds = html.replace(re, (full: string, tag: string, attrs: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').trim()
    if (!text) return full
    const existing = /\bid="([^"]+)"/i.exec(attrs)?.[1]
    const id = existing || `toc-${headings.length}`
    headings.push({ level: parseInt(tag[1]), text, id })
    return existing ? full : `<${tag}${attrs} id="${id}">${inner}</${tag}>`
  })
  if (headings.length === 0) return withIds
  const tocItems = headings.map(h =>
    `<li style="margin-left:${(h.level - 1) * 16}px"><a href="#${h.id}" style="color:var(--text-secondary);text-decoration:none;font-size:13px">${h.text}</a></li>`
  ).join('\n')
  const tocHTML = `<nav style="margin-bottom:32px;padding:16px 20px;background:var(--bg-code);border-left:3px solid var(--accent-primary);border-radius:0 8px 8px 0"><h2 style="margin:0 0 12px;font-size:16px;color:var(--text-heading)">目录</h2><ul style="margin:0;padding:0;list-style:none">${tocItems}</ul></nav>`
  return tocHTML + withIds
}

function addPageNumbers(html: string, paperSize: string, orientation: string): string {
  const pageW = PAPER_SIZES[paperSize] || '210mm'
  const pageH = PAPER_HEIGHTS[paperSize] || '297mm'
  const isLandscape = orientation === 'landscape'
  // 真正的页码：打印引擎支持 @page 边距框时输出 counter(page)；不支持时
  // 至少纸张尺寸/方向是真实的（之前只改了 max-width，@page 完全没写）。
  const pageSize = isLandscape ? `${pageH} ${pageW}` : `${pageW} ${pageH}`
  const extraCSS = `
    @page {
      size: ${pageSize};
      margin: 15mm 10mm 18mm;
      @bottom-center { content: counter(page) " / " counter(pages); font-size: 9pt; color: #888; }
    }
    @media print {
      body { padding: 0; max-width: none; }
      h1, h2, h3 { page-break-after: avoid; }
      pre, table, blockquote { page-break-inside: avoid; }
    }
    .page-footer { display: none; }
  `
  return html.replace('</body>', `
    <div class="page-footer">— ${paperSize.toUpperCase()} · ${orientation === 'portrait' ? '纵向' : '横向'} —</div>
  </body>`).replace('</style>', `${extraCSS}</style>`)
}

function addLineNumbers(html: string): string {
  return html
    .replace(/<pre><code class="[^"]*language-(\w+)[^"]*">([\s\S]*?)<\/code><\/pre>/gi, (_m: any, lang: string, code: string) => {
      const lines = code.split('\n')
      const numbered = lines.map((line: string, i: number) =>
        `<span class="ln">${i + 1}</span><span class="lc">${line}</span>`
      ).join('\n')
      return `<pre class="code-block" data-lang="${lang}"><code>${numbered}</code></pre>`
    })
    .replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_m: any, code: string) => {
      const lines = code.split('\n')
      const numbered = lines.map((line: string, i: number) =>
        `<span class="ln">${i + 1}</span><span class="lc">${line}</span>`
      ).join('\n')
      return `<pre class="code-block"><code>${numbered}</code></pre>`
    })
}

function generateHeadingCSS(headingStyles: Record<string, string>, accent: string, baseSize: number): string {
  const sizes: Record<string, number> = { h1: 28, h2: 22, h3: 18, h4: 16, h5: 15, h6: 14 }
  const rules: string[] = []
  for (const [level, style] of Object.entries(headingStyles)) {
    if (!style || style === 'default') continue
    const sz = Math.round((sizes[level] || 16) / 17 * baseSize)
    if (style === 'color-only') {
      rules.push(`#${level}{color:${accent};background:transparent}`)
    } else if (style === 'border-bottom') {
      rules.push(`#${level}{display:block;text-align:left;background:transparent;padding-bottom:0.3em;border-bottom:2px solid ${accent};color:${accent};font-size:${sz}px}`)
    } else if (style === 'border-left') {
      rules.push(`#${level}{display:block;text-align:left;margin-left:0;padding-left:10px;border-left:4px solid ${accent};color:${accent};background:transparent;font-size:${sz}px}`)
    }
  }
  return rules.join('')
}

/** Render content into off-screen DOM, inline all computed styles, return self-contained HTML. */
function buildStyledHTML(title: string, content: string, opts: any): string {
  const pageW = PAPER_SIZES[opts.paperSize] || '210mm'
  const pageH = PAPER_HEIGHTS[opts.paperSize] || '297mm'
  const v = acksThemeToLzTokens(themeFor(opts.typographyTheme))
  const container = document.createElement('div')
  const fs = opts.fontSize ?? 14
  const lh = opts.lineHeight ?? '1.8'
  const ff = opts.fontFamily || DEFAULT_EXPORT_FONT
  container.style.cssText = `position:fixed;left:-9999px;top:0;width:${opts.orientation==='landscape'?'1200px':'800px'};background:${v.overlay};color:${v.text};font-family:${ff};line-height:${lh};padding:20px;font-size:${fs}px${opts.textIndent ? ';text-indent:2em' : ''}${opts.textJustify ? ';text-align:justify' : ''}`
  container.innerHTML = `<h1 style="font-size:2em;margin:0.67em 0;border-bottom:2px solid ${v.primary};padding-bottom:0.3em">${title}</h1>${content}`
  document.body.appendChild(container)
  ;(function inlineEl(node: Node): void {
    if (node.nodeType !== 1) return
    const el = node as Element
    try {
      const cs = window.getComputedStyle(el as HTMLElement)
      const props = ['color','fontSize','fontWeight','fontStyle','fontFamily','lineHeight','textDecoration','textAlign','letterSpacing','whiteSpace','display','paddingTop','paddingBottom','paddingLeft','paddingRight','marginTop','marginBottom','marginLeft','marginRight','borderTopWidth','borderBottomWidth','borderLeftWidth','borderRightWidth','borderTopColor','borderBottomColor','borderLeftColor','borderRightColor','borderStyle','borderRadius','overflow']
      const parts: string[] = []
      for (const p of props) {
        const val = cs[p as keyof CSSStyleDeclaration] as string
        if (val && val !== 'normal' && val !== 'none' && val !== '0px' && val !== 'auto' && !val.startsWith('0em')) parts.push(`${p}:${val}`)
      }
      if (parts.length) (el as HTMLElement).style.cssText += parts.join(';')
    } catch (e) { silentError('导出时内联样式失败', e) }
    for (const child of Array.from(el.childNodes)) inlineEl(child)
  })(container)
  const innerHTML = container.innerHTML
  document.body.removeChild(container)
  const accentA5 = `rgba(${hexToRgb(v.primary)},0.05)`
  const fsPx = opts.fontSize ?? 14
  const lhVal = opts.lineHeight ?? '1.8'
  const ffVal = opts.fontFamily || DEFAULT_EXPORT_FONT
  const pStyle = `${opts.textIndent ? 'text-indent:2em;' : ''} ${opts.textJustify ? 'text-align:justify;' : ''}`.trim()
  const headingCSS = opts.headingStyles ? generateHeadingCSS(opts.headingStyles, v.primary, fsPx) : ''
  const linkCSS = opts.linkColor ? `a{color:${opts.linkColor};text-decoration:none}` : ''
  const bqCSS = opts.blockquoteBackground ? `blockquote{background:${opts.blockquoteBackground}}` : ''
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:${ffVal};font-size:${fsPx}px;line-height:${lhVal};max-width:${opts.orientation==='landscape'?pageH:pageW};margin:0 auto;padding:20px;background:${v.overlay};color:${v.text}}h1,h2,h3,h4{font-weight:600;line-height:1.3}h1{font-size:2em;margin:0.67em 0;border-bottom:2px solid ${v.primary};padding-bottom:0.3em}h2{font-size:1.5em;margin:0.83em 0}h3{font-size:1.17em;margin:1em 0}p{margin:0.5em 0${pStyle ? `;${pStyle}` : ''}}code{font-family:"JetBrains Mono",monospace;background:${v.code};padding:2px 6px;border-radius:4px;font-size:0.88em}pre{background:${v.code};padding:16px;overflow-x:auto;border-radius:8px;border:1px solid ${v.border};margin:12px 0}pre code{background:none;padding:0}pre .ln{color:#999;margin-right:12px;display:inline-block;width:24px;text-align:right;user-select:none}blockquote{border-left:3px solid ${v.primary};padding:8px 16px;margin:16px 0;background:${accentA5};border-radius:0 8px 8px 0}${bqCSS}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid ${v.border};padding:8px 12px}th{background:${v.code}}ul,ol{padding-left:24px;margin:8px 0}li{margin:4px 0}hr{border:none;height:1px;background:${v.border};margin:24px 0}a{color:${v.primary};text-decoration:none}a:hover{text-decoration:underline}${linkCSS}img{max-width:100%;height:auto;border-radius:8px}@media print{body{padding:10mm}}${headingCSS}${opts.extraCSS || ''}</style></head><body class="${opts.macCodeBlock ? 'mac-code' : ''}">${innerHTML}</body></html>`
}

/** 把 Mermaid/ECharts 代码块渲染成静态 SVG/图片后再导出；导出件是独立
 *  HTML，不会跑预览里的增强管线，之前图表只能以源码形式出现。 */
async function renderDiagrams(html: string): Promise<string> {
  if (!/language-(mermaid|echarts)/.test(html)) return html
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-99999px;top:0;width:900px;background:#fff'
  host.innerHTML = html
  document.body.appendChild(host)
  try {
    await renderMermaidBlocks(host, false)
    await renderEchartsBlocks(host)
    // ECharts 画在 canvas 上，innerHTML 拿不到像素，转成 img 才能被导出。
    host.querySelectorAll('canvas').forEach((canvas) => {
      try {
        const img = document.createElement('img')
        img.src = (canvas as HTMLCanvasElement).toDataURL('image/png')
        img.alt = 'chart'
        img.style.maxWidth = '100%'
        canvas.replaceWith(img)
      } catch { /* 单张失败不影响其它图 */ }
    })
    return host.innerHTML
  } catch {
    return host.innerHTML || html
  } finally {
    document.body.removeChild(host)
  }
}

export async function exportDocument(options: ExportOptions): Promise<void> {
  const { title, content, format, options: expOpts = {} } = options
  const typographyTheme = expOpts.typographyTheme || DEFAULT_TYPOGRAPHY_THEME
  const includeTOC = expOpts.includeTOC !== false
  const includeLineNumbers = expOpts.includeLineNumbers || false
  const includePageNumbers = expOpts.includePageNumbers || false
  const paperSize = expOpts.paperSize || 'a4'
  const orientation = expOpts.orientation || 'portrait'
  const cssVars = getCSSVars(typographyTheme)
  const typoOpts = {
    fontSize: expOpts.fontSize,
    lineHeight: expOpts.lineHeight,
    fontFamily: expOpts.fontFamily,
    textIndent: expOpts.textIndent,
    textJustify: expOpts.textJustify,
    linkColor: expOpts.linkColor,
    blockquoteBackground: expOpts.blockquoteBackground,
    headingStyles: expOpts.headingStyles,
    typographyTheme,
    codeTheme: expOpts.codeTheme,
    macCodeBlock: expOpts.macCodeBlock,
  }

  const renderedContent = ['md', 'xlsx', 'drawio'].includes(format)
    ? content
    : await renderDiagrams(content)

  switch (format) {
    case 'html':
      await exportHTML(title, renderedContent, { cssVars, includeTOC, includeLineNumbers, includePageNumbers, paperSize, orientation, ...typoOpts })
      break
    case 'md':
      exportMarkdown(title, content)
      break
    case 'pdf':
      // 直接生成 PDF 文件下载（优化 #22），不再走浏览器打印对话框
      await renderPdfAndDownload(title, renderedContent, { cssVars, includeTOC, includeLineNumbers, includePageNumbers, paperSize, orientation, ...typoOpts })
      break
    case 'docx':
      await exportDOCX(title, renderedContent, { cssVars, includeTOC, includeLineNumbers, includePageNumbers, paperSize, orientation, ...typoOpts })
      break
    case 'epub':
      await exportEPUB(title, renderedContent, { cssVars, includeTOC, includeLineNumbers, includePageNumbers, paperSize, orientation, ...typoOpts })
      break
    case 'png':
      exportPNG(title, renderedContent, typoOpts)
      break
    case 'svg':
      exportSVG(title, renderedContent, typoOpts)
      break
    case 'xlsx':
      await exportXLSX(title, content)
      break
    case 'drawio':
      exportDrawio(title, content)
      break
  }
}

async function exportHTML(title: string, content: string, opts: any): Promise<void> {
  const theme = getCodeTheme(opts.codeTheme || 'atom-one-dark')
  const codeCSS = await loadCodeThemeCSS(opts.codeTheme)
  const macCSS = opts.macCodeBlock ? macCodeCSS(theme.macBg) : ''
  const tocHTML = opts.includeTOC ? buildTOC(content) : content
  const processed = opts.includeLineNumbers ? addLineNumbers(tocHTML) : tocHTML
  const finalContent = opts.includePageNumbers ? addPageNumbers(processed, opts.paperSize, opts.orientation) : processed
  const html = buildStyledHTML(title, finalContent, { ...opts, typographyTheme: opts.typographyTheme || DEFAULT_TYPOGRAPHY_THEME, extraCSS: codeCSS + macCSS })
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.html`
  a.click()
  URL.revokeObjectURL(url)
}

function exportMarkdown(title: string, content: string): void {
  // 源文件已有 H1 时不要再前置一个标题，否则导出件出现两个 H1。
  const hasH1 = /^\s*#\s+\S/.test(content)
  const md = hasH1 ? content : `# ${title}

${content}`
  const blob = new Blob([`${md}

---
Generated by lzeditor
`], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.md`
  a.click()
  URL.revokeObjectURL(url)
}

/** 前端直接生成 PDF 文件并下载（优化 #22）：不再调浏览器打印对话框。
 *  用隐藏 iframe 承载导出 HTML → html2canvas 栅格化 → jsPDF 逐页拼装 → Blob 下载。 */
async function renderPdfAndDownload(title: string, content: string, opts: any): Promise<void> {
  const theme = getCodeTheme(opts.codeTheme || 'atom-one-dark')
  const codeCSS = await loadCodeThemeCSS(opts.codeTheme)
  const macCSS = opts.macCodeBlock ? macCodeCSS(theme.macBg) : ''
  const tocHTML = opts.includeTOC ? buildTOC(content) : content
  const processed = opts.includeLineNumbers ? addLineNumbers(tocHTML) : tocHTML
  const finalContent = opts.includePageNumbers ? addPageNumbers(processed, opts.paperSize, opts.orientation) : processed
  const pageW = PAPER_SIZES[opts.paperSize] || '210mm'
  const pageH = PAPER_HEIGHTS[opts.paperSize] || '297mm'

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: ${opts.fontFamily || DEFAULT_EXPORT_FONT};
      font-size: ${Number(opts.fontSize) || 16}pt;
      line-height: ${opts.lineHeight || 1.7};
      max-width: ${opts.orientation === 'landscape' ? pageH : pageW};
      margin: 0 auto;
      padding: 15mm 10mm;
      color: var(--text-primary);
      background: var(--bg-overlay);
      ${opts.textJustify ? 'text-align: justify;' : ''}
    }
    h1, h2, h3 { page-break-after: avoid; text-align: left; }
    ${opts.textIndent ? 'p { text-indent: 2em; }' : ''}
    code { background: var(--bg-code); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: var(--bg-code); padding: 16px; overflow-x: auto; border-radius: 8px; }
    pre code { background: none; padding: 0; }
    .code-block .ln { color: var(--text-muted); margin-right: 16px; display: inline-block; width: 24px; text-align: right; user-select: none; }
    blockquote { border-left: 3px solid var(--accent-primary); padding: 8px 16px; margin: 16px 0; background: var(--accent-a5); border-radius: 0 8px 8px 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid var(--border-default); padding: 8px 12px; }
    th { background: var(--bg-code); }
    .page-footer { text-align: center; font-size: 10pt; color: #888; padding: 10px; border-top: 1px solid var(--border-subtle); margin-top: 40px; }
    ${opts.cssVars}
    ${codeCSS}
    ${macCSS}
  </style>
</head>
<body class="${opts.macCodeBlock ? 'mac-code' : ''}">
  <h1>${title}</h1>
  ${finalContent}
  <div class="page-footer">— ${opts.paperSize.toUpperCase()} · ${opts.orientation === 'portrait' ? '纵向' : '横向'} —</div>
</body>
</html>`

  // 隐藏 iframe 承载导出文档，不弹窗、不打印对话框
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.left = '-99999px'
  iframe.style.top = '0'
  iframe.style.width = '1000px'
  iframe.style.height = '1400px'
  iframe.style.border = '0'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  if (!doc) throw new Error('无法创建导出文档')

  doc.open()
  doc.write(html)
  doc.close()

  // 等待布局 + 图片加载完成
  await new Promise<void>(r => {
    const check = () => {
      const imgs = Array.from(doc.images)
      const ready = imgs.every(img => img.complete)
      if (ready) r()
      else setTimeout(check, 60)
    }
    setTimeout(check, 250)
  })

  const html2canvas = (await import('html2canvas')).default
  const canvas = await html2canvas(doc.body, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    windowWidth: 1000,
  })

  const { jsPDF } = await import('jspdf')
  const wMm = parseFloat(pageW)
  const hMm = parseFloat(pageH)
  const pdf = new jsPDF({
    orientation: opts.orientation === 'landscape' ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [wMm, hMm],
  })

  const pdfW = pdf.internal.pageSize.getWidth()
  const pdfH = pdf.internal.pageSize.getHeight()
  const imgH = (canvas.height * pdfW) / canvas.width
  const imgData = canvas.toDataURL('image/png')

  // 内容超出一页时逐页拼接（jsPDF 的 addImage 超出页高的部分会被裁掉，需 offset 重绘）
  let heightLeft = imgH
  let position = 0
  let pageNo = 1
  const stampPage = () => {
    if (!opts.includePageNumbers) return
    pdf.setFontSize(9)
    pdf.setTextColor(136)
    pdf.text(String(pageNo), pdfW / 2, pdfH - 5, { align: 'center' })
  }
  pdf.addImage(imgData, 'PNG', 0, position, pdfW, imgH)
  stampPage()
  heightLeft -= pdfH
  while (heightLeft > 0) {
    position = heightLeft - imgH
    pdf.addPage()
    pdf.addImage(imgData, 'PNG', 0, position, pdfW, imgH)
    pageNo += 1
    stampPage()
    heightLeft -= pdfH
  }

  pdf.save(`${title}.pdf`)
  document.body.removeChild(iframe)
}

async function exportDOCX(title: string, content: string, opts: any): Promise<void> {
  // 生成真正的 OOXML 包。之前的实现把 HTML 塞进 Blob 再谎报 docx 的 MIME，
  // Word 只能靠启发式猜测，严格查看器直接判为损坏。
  const { generateDOCX } = await import('./docxGenerator')
  const tocHTML = opts.includeTOC ? buildTOC(content) : content
  const processed = opts.includeLineNumbers ? addLineNumbers(tocHTML) : tocHTML
  const pageW = PAPER_SIZES[opts.paperSize] || '210mm'
  const pageH = PAPER_HEIGHTS[opts.paperSize] || '297mm'
  const footer = `Generated by lzeditor · ${opts.paperSize.toUpperCase()} ${opts.orientation === 'landscape' ? '横向' : '纵向'} · ${pageW}×${pageH}`

  const blob = await generateDOCX({
    title,
    content: processed,
    footer,
    fontSize: opts.fontSize,
    fontFamily: opts.fontFamily,
    lineHeight: opts.lineHeight,
    textIndent: opts.textIndent,
    textJustify: opts.textJustify,
    pageSize: opts.orientation === 'landscape'
      ? { widthMm: parseFloat(pageH), heightMm: parseFloat(pageW) }
      : { widthMm: parseFloat(pageW), heightMm: parseFloat(pageH) },
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.docx`
  a.click()
  URL.revokeObjectURL(url)
}

/** 按 h1/h2 切分章节：有标题就走多章，否则整篇作为一章。 */
function splitChapters(html: string, fallbackTitle: string): Array<{ title: string; content: string }> {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const body = doc.body
  const heads = Array.from(body.querySelectorAll('h1, h2'))
  if (heads.length === 0) return [{ title: fallbackTitle, content: html }]

  const chapters: Array<{ title: string; content: string }> = []
  let prelude: string[] = []

  heads.forEach((h, i) => {
    const buffer = prelude.length && i === 0 ? prelude : []
    // 收集该标题之后的兄弟节点，直到下一个 h1/h2
    let node: Node | null = h
    const parts: string[] = []
    do {
      parts.push((node as Element).outerHTML)
      node = node.nextSibling
    } while (node && !/^H[12]$/.test(node.nodeName))
    buffer.push(...parts)
    chapters.push({ title: h.textContent?.trim() || `章节 ${chapters.length + 1}`, content: buffer.join('') })
  })

  if (chapters.length === 1 && prelude.length) {
    chapters.push({ title: fallbackTitle, content: prelude.join('') })
  }
  return chapters
}

async function exportEPUB(title: string, content: string, opts: any): Promise<void> {
  const tocHTML = opts.includeTOC ? buildTOC(content) : content
  const processed = opts.includeLineNumbers ? addLineNumbers(tocHTML) : tocHTML

  const { generateEPUB } = await import('./epubGenerator')
  // 之前硬编码单章，epubGenerator 的多章能力完全闲置；这里按 h1/h2 真正拆章。
  const chapters = splitChapters(processed, '正文')
  const codeCSS = await loadCodeThemeCSS(opts.codeTheme || 'atom-one-dark')
  const blob = await generateEPUB({
    title,
    author: 'lzeditor',
    chapters,
    includeTOC: opts.includeTOC !== false,
    fontSize: opts.fontSize,
    fontFamily: opts.fontFamily,
    lineHeight: opts.lineHeight,
    textIndent: opts.textIndent,
    textJustify: opts.textJustify,
    codeCSS,
  })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.epub`
  a.click()
  URL.revokeObjectURL(url)
}

async function exportPNG(title: string, content: string, opts: any = {}): Promise<void> {
  const { toPng } = await import('html-to-image')
  const node = document.createElement('div')
  node.style.cssText = `padding:32px;font-family:${opts.fontFamily || DEFAULT_EXPORT_FONT};line-height:${opts.lineHeight || 1.7};font-size:${Number(opts.fontSize) || 14}px;background:#fff;color:#1a1a1a;max-width:800px;margin:0 auto${opts.textJustify ? ';text-align:justify' : ''}`
  node.innerHTML = `${opts.textIndent ? '<style>p{text-indent:2em}</style>' : ''}<h1 style="font-size:2em;border-bottom:2px solid #333;padding-bottom:0.3em">${title}</h1>${content}`
  document.body.appendChild(node)
  try {
    const dataUrl = await toPng(node, { width: 800, style: { overflow: 'visible' } })
    document.body.removeChild(node)
    const blob = await (await fetch(dataUrl)).blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.png`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    document.body.removeChild(node)
    throw new Error('PNG 导出失败')
  }
}

async function exportSVG(title: string, content: string, opts: any = {}): Promise<void> {
  const node = document.createElement('div')
  node.style.cssText = `padding:32px;font-family:${opts.fontFamily || DEFAULT_EXPORT_FONT};line-height:${opts.lineHeight || 1.7};font-size:${Number(opts.fontSize) || 14}px;background:#fff;color:#1a1a1a;max-width:800px${opts.textJustify ? ';text-align:justify' : ''}`
  node.innerHTML = `${opts.textIndent ? '<style>p{text-indent:2em}</style>' : ''}<h1 style="font-size:2em;border-bottom:2px solid #333;padding-bottom:0.3em">${title}</h1>${content}`
  document.body.appendChild(node)
  try {
    const { toSvg } = await import('html-to-image')
    const svgData = await toSvg(node, { width: 800 })
    document.body.removeChild(node)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title}.svg`
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    document.body.removeChild(node)
    throw new Error('SVG 导出失败')
  }
}

async function exportXLSX(title: string, content: string): Promise<void> {
  const XLSX = await import('xlsx')
  const { utils, writeFile } = XLSX
  // Extract tables from content
  const stripTags = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, '')).trim()
  const tableMatches = content.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || []
  const rows: string[][] = [['内容']]
  if (tableMatches.length > 0) {
    tableMatches.forEach(tbl => {
      const cells = tbl.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []
      const rowData = cells.map(stripTags)
      if (rowData.length) rows.push(rowData)
    })
  } else {
    const paragraphs = content.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || []
    paragraphs.slice(0, 50).forEach(p => rows.push([stripTags(p)]))
  }
  const ws = utils.aoa_to_sheet(rows)
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, '文档内容')
  writeFile(wb, `${title}.xlsx`)
}

const decodeEntities = (s: string) =>
  s.replace(/&nbsp;/g, ' ')
   .replace(/&lt;/g, '<')
   .replace(/&gt;/g, '>')
   .replace(/&quot;/g, '"')
   .replace(/&#39;|&apos;/g, "'")
   .replace(/&amp;/g, '&')
   .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

/**
 * 真正的 .drawio：之前把剥掉标签的纯文本直接塞进 `<root>`，draw.io 打不开。
 * 这里生成合法的 mxfile 结构 —— 每个块级元素一个节点，纵向排布并用连线串起阅读顺序，
 * 标题 / 列表项 / 代码块用不同样式区分。
 */
function exportDrawio(title: string, content: string): void {
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const strip = (s: string) => s.replace(/\s+/g, ' ').trim()
  const decode = (s: string) => {
    const ta = document.createElement('textarea')
    ta.innerHTML = s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
    return ta.value
  }

  interface DNode { id: number; value: string; style: string; h: number; children?: DNode[] }
  const roots: DNode[] = []
  let nid = 10

  const doc = new DOMParser().parseFromString(`<body>${content}</body>`, 'text/html')
  const body = doc.body

  const pushNode = (value: string, style: string, h: number, list: DNode[] = roots) => {
    list.push({ id: nid++, value, style, h })
  }

  Array.from(body.children).forEach(el => {
    const tag = el.tagName.toLowerCase()
    if (/^h[1-6]$/.test(tag)) {
      pushNode(esc(strip(decode(el.textContent || ''))), 'rounded=0;whiteSpace=wrap;html=1;fontSize=16;fontStyle=1;fillColor=#dae8fc;strokeColor="#6c8ebf";align=left;', 44)
      return
    }
    if (tag === 'hr') return
    if (tag === 'ul' || tag === 'ol') {
      Array.from(el.querySelectorAll(':scope > li')).forEach((li, i) => {
        const text = strip(decode(li.textContent || ''))
        pushNode(`${tag === 'ol' ? `${i + 1}.` : '•'} ${esc(text)}`,
          'rounded=1;whiteSpace=wrap;html=1;align=left;spacingLeft=8;', 36)
      })
      return
    }
    if (tag === 'pre') {
      pushNode(esc(decode(el.textContent || '')),
        'shape=note;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#999;fontFamily=Consolas;fontSize=11;align=left;verticalAlign=top;spacing=8;', 64)
      return
    }
    if (tag === 'table') {
      const rows = Array.from(el.querySelectorAll('tr')).slice(0, 20)
      const text = rows.map(r => Array.from(r.children).map(c => strip(decode(c.textContent || ''))).join(' | ')).join('\n')
      pushNode(esc(text), 'shape=table;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor="#d6b656";align=left;verticalAlign=top;spacing=6;', 60)
      return
    }
    const text = strip(decode(el.textContent || ''))
    if (text) pushNode(esc(text), 'rounded=1;whiteSpace=wrap;html=1;align=left;spacingLeft=6;', 40)
  })

  // 纵向布局：标题稍宽，正文统一宽度，间隙 24px
  const W = 420
  let y = 40
  const placed = roots.map(n => {
    const h = n.style.includes('shape=note') ? Math.max(56, Math.round(n.value.length / 26) * 16 + 24) : n.h
    const geo = `<mxGeometry x="40" y="${y}" width="${W}" height="${h}" as="geometry"/>`
    const cell = `<mxCell id="${n.id}" value="${n.value}" style="${n.style}" vertex="1" parent="1">${geo}</mxCell>`
    y += h + 24
    return { cell, id: n.id, y: y - 24 }
  })

  // 相邻节点连线，表示阅读顺序
  const edges = placed.slice(1).map((p, i) => {
    const prev = placed[i]
    return `<mxCell id="${nid++}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" edge="1" parent="1" source="${prev.id}" target="${p.id}"><mxGeometry relative="1" as="geometry"/></mxCell>`
  }).join('\n    ')

  const pageH = Math.max(1169, y + 120)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="lzeditor" agent="lzeditor" version="24.0.0" type="device">
  <diagram id="lzeditor-doc" name="${esc(title)}">
    <mxGraphModel dx="1422" dy="755" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="${pageH}" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${placed.map(p => p.cell).join('\n    ')}
        ${edges}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`

  const blob = new Blob([xml], { type: 'application/vnd.jgraph.mxfile' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.drawio`
  a.click()
  URL.revokeObjectURL(url)
}
