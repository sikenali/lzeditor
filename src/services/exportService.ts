
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

const TYPOGRAPHY_THEME_VARS: Record<string, Record<string, string>> = {
  classic:    { primary: '#333333', text: '#2b2b2b', muted: '#647d96', heading: '#1a1a1a', code: '#f6f8fa', overlay: '#ffffff', border: '#e1e4e8', amber: '#d02f55' },
  'wechat-green': { primary: '#07c160', text: '#1f1f1f', muted: '#52705f', heading: '#067f42', code: '#f0f8f0', overlay: '#f5faf5', border: '#d4ecc8', amber: '#0a8f4d' },
  'tech-blue': { primary: '#1e6bb8', text: '#14508c', muted: '#4a6a85', heading: '#14508c', code: '#f0f6fb', overlay: '#f8faff', border: '#d3e5f3', amber: '#1a63aa' },
  lanying:    { primary: '#3aa1f0', text: '#0e6fd0', muted: '#4f6b83', heading: '#0e6fd0', code: '#f0f8ff', overlay: '#f8faff', border: '#c5e2f8', amber: '#0d67c2' },
  'orange-heart': { primary: '#ef7060', text: '#e05442', muted: '#595959', heading: '#e05442', code: '#fef8f6', overlay: '#fff8fa', border: '#f6ddd8', amber: '#d95948' },
  violet:     { primary: '#8e44ad', text: '#6d3487', muted: '#6f5680', heading: '#6d3487', code: '#faf7fc', overlay: '#fbf8ff', border: '#e7d8ef', amber: '#83429f' },
  ink:        { primary: '#576b95', text: '#40464f', muted: '#666e7e', heading: '#2f353d', code: '#f6f7f9', overlay: '#ffffff', border: '#dfe3ea', amber: '#4f608a' },
  'chinese-red': { primary: '#c0392b', text: '#a93226', muted: '#7a5750', heading: '#a93226', code: '#fef8f6', overlay: '#fff8fa', border: '#f0d5d0', amber: '#b03425' },
  bamboo:     { primary: '#0e9285', text: '#0b7268', muted: '#4f6f6b', heading: '#0e9285', code: '#f0f8f6', overlay: '#f8faff', border: '#b9e2dc', amber: '#0b7268' },
  magazine:   { primary: '#1a1a1a', text: '#2b2b2b', muted: '#6b6b6b', heading: '#1a1a1a', code: '#faf7ef', overlay: '#ffffff', border: '#e6dfd0', amber: '#8a6d1d' },
  night:      { primary: '#7aa2f7', text: '#c6cade', muted: '#565f89', heading: '#7aa2f7', code: '#24283b', overlay: '#1a1b26', border: '#414868', amber: '#ff9e64' },
  sakura:     { primary: '#e8618c', text: '#2f2f2f', muted: '#8a6470', heading: '#d8577f', code: '#fdf6f9', overlay: '#fff8fa', border: '#f5d9e2', amber: '#d8577f' },
  minimal:    { primary: '#3d3d3d', text: '#3d3d3d', muted: '#8c8c8c', heading: '#1f1f1f', code: '#f5f5f5', overlay: '#ffffff', border: '#e0e0e0', amber: '#595959' },
}
const DEFAULT_THEME_VARS = TYPOGRAPHY_THEME_VARS.classic

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function getCSSVars(typographyThemeId: string): string {
  const v = TYPOGRAPHY_THEME_VARS[typographyThemeId] || DEFAULT_THEME_VARS
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
  const re = /<(h[1-6])[^>]*>([\s\S]*?)<\/h\1>/gi
  let match
  while ((match = re.exec(html)) !== null) {
    const level = parseInt(match[1][1])
    const text = match[2].replace(/<[^>]+>/g, '').trim()
    if (text) {
      const id = `toc-${headings.length}`
      headings.push({ level, text, id })
    }
  }
  if (headings.length === 0) return html
  const tocItems = headings.map(h =>
    `<li style="margin-left:${(h.level - 1) * 16}px"><a href="#${h.id}" style="color:var(--text-secondary);text-decoration:none;font-size:13px">${h.text}</a></li>`
  ).join('\n')
  const tocHTML = `<nav style="margin-bottom:32px;padding:16px 20px;background:var(--bg-code);border-left:3px solid var(--accent-primary);border-radius:0 8px 8px 0"><h2 style="margin:0 0 12px;font-size:16px;color:var(--text-heading)">目录</h2><ul style="margin:0;padding:0;list-style:none">${tocItems}</ul></nav>`
  return tocHTML + html
}

function addPageNumbers(html: string, paperSize: string, orientation: string): string {
  const pageW = PAPER_SIZES[paperSize] || '210mm'
  const pageH = PAPER_HEIGHTS[paperSize] || '297mm'
  const isLandscape = orientation === 'landscape'
  const extraCSS = `
    @media print {
      body { padding: 15mm 10mm; }
      .page-footer {
        position: fixed; bottom: 0; left: 0; right: 0;
        text-align: center; font-size: 10pt; color: #888;
        border-top: 1px solid #ddd; padding: 6px;
      }
      h1, h2, h3 { page-break-after: avoid; }
      pre, table, blockquote { page-break-inside: avoid; }
    }
  `
  return html.replace('</body>', `
    <div class="page-footer">— ${isLandscape ? pageH : pageW} · ${orientation === 'portrait' ? '纵向' : '横向'} —</div>
  </body>`).replace('</style>', `${extraCSS}</style>`)
}

function addLineNumbers(html: string): string {
  return html
    .replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/gi, (_m: any, lang: string, code: string) => {
      const lines = code.split('\n')
      const numbered = lines.map((line: string, i: number) =>
        `<span class="ln">${i + 1}</span><span class="lc">${line}</span>`
      ).join('\n')
      return `<pre class="code-block" data-lang="${lang}"><code>${numbered}</code></pre>`
    })
    .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, (_m: any, code: string) => {
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
  const v = TYPOGRAPHY_THEME_VARS[opts.typographyTheme] || DEFAULT_THEME_VARS
  const container = document.createElement('div')
  const fs = opts.fontSize ?? 14
  const lh = opts.lineHeight ?? '1.8'
  const ff = opts.fontFamily || '"Noto Serif SC",system-ui,serif'
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
    } catch {}
    for (const child of Array.from(el.childNodes)) inlineEl(child)
  })(container)
  const innerHTML = container.innerHTML
  document.body.removeChild(container)
  const accentA5 = `rgba(${hexToRgb(v.primary)},0.05)`
  const fsPx = opts.fontSize ?? 14
  const lhVal = opts.lineHeight ?? '1.8'
  const ffVal = opts.fontFamily || '"Noto Serif SC","Source Han Serif SC",system-ui,serif'
  const pStyle = `${opts.textIndent ? 'text-indent:2em;' : ''} ${opts.textJustify ? 'text-align:justify;' : ''}`.trim()
  const headingCSS = opts.headingStyles ? generateHeadingCSS(opts.headingStyles, v.primary, fsPx) : ''
  const linkCSS = opts.linkColor ? `a{color:${opts.linkColor};text-decoration:none}` : ''
  const bqCSS = opts.blockquoteBackground ? `blockquote{background:${opts.blockquoteBackground}}` : ''
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&family=JetBrains+Mono&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:${ffVal};font-size:${fsPx}px;line-height:${lhVal};max-width:${opts.orientation==='landscape'?pageH:pageW};margin:0 auto;padding:20px;background:${v.overlay};color:${v.text}}h1,h2,h3,h4{font-weight:600;line-height:1.3}h1{font-size:2em;margin:0.67em 0;border-bottom:2px solid ${v.primary};padding-bottom:0.3em}h2{font-size:1.5em;margin:0.83em 0}h3{font-size:1.17em;margin:1em 0}p{margin:0.5em 0${pStyle ? `;${pStyle}` : ''}}code{font-family:"JetBrains Mono",monospace;background:${v.code};padding:2px 6px;border-radius:4px;font-size:0.88em}pre{background:${v.code};padding:16px;overflow-x:auto;border-radius:8px;border:1px solid ${v.border};margin:12px 0}pre code{background:none;padding:0}blockquote{border-left:3px solid ${v.primary};padding:8px 16px;margin:16px 0;background:${accentA5};border-radius:0 8px 8px 0}${bqCSS}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid ${v.border};padding:8px 12px}th{background:${v.code}}ul,ol{padding-left:24px;margin:8px 0}li{margin:4px 0}hr{border:none;height:1px;background:${v.border};margin:24px 0}a{color:${v.primary};text-decoration:none}a:hover{text-decoration:underline}${linkCSS}img{max-width:100%;height:auto;border-radius:8px}@media print{body{padding:10mm}}${headingCSS}</style></head><body>${innerHTML}</body></html>`
}

export async function exportDocument(options: ExportOptions): Promise<void> {
  const { title, content, format, options: expOpts = {} } = options
  const typographyTheme = expOpts.typographyTheme || 'classic'
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

  switch (format) {
    case 'html':
      exportHTML(title, content, { cssVars, includeTOC, includeLineNumbers, includePageNumbers, paperSize, orientation, ...typoOpts })
      break
    case 'md':
      exportMarkdown(title, content)
      break
    case 'pdf':
      await exportPDF(title, content, { cssVars, includeTOC, includeLineNumbers, includePageNumbers, paperSize, orientation, ...typoOpts })
      break
    case 'docx':
      exportDOCX(title, content, { cssVars, includeTOC, includeLineNumbers, includePageNumbers, paperSize, orientation, ...typoOpts })
      break
    case 'epub':
      await exportEPUB(title, content, { cssVars, includeTOC, includeLineNumbers, includePageNumbers, paperSize, orientation, ...typoOpts })
      break
    case 'png':
      exportPNG(title, content)
      break
    case 'svg':
      exportSVG(title, content)
      break
    case 'xlsx':
      exportXLSX(title, content)
      break
    case 'drawio':
      exportDrawio(title, content)
      break
  }
}

function exportHTML(title: string, content: string, opts: any): void {
  const processed = opts.includeLineNumbers ? addLineNumbers(content) : content
  const finalContent = opts.includePageNumbers ? addPageNumbers(processed, opts.paperSize, opts.orientation) : processed
  const html = buildStyledHTML(title, finalContent, { ...opts, typographyTheme: opts.typographyTheme || 'classic' })
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.html`
  a.click()
  URL.revokeObjectURL(url)
}

function exportMarkdown(title: string, content: string): void {
  const md = `# ${title}

${content}

---
Generated by lzeditor
`
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.md`
  a.click()
  URL.revokeObjectURL(url)
}

async function exportPDF(title: string, content: string, opts: any): Promise<void> {
  const tocHTML = opts.includeTOC ? buildTOC(content) : content
  const processed = opts.includeLineNumbers ? addLineNumbers(tocHTML) : tocHTML
  const finalContent = opts.includePageNumbers ? addPageNumbers(processed, opts.paperSize, opts.orientation) : processed
  const pageW = PAPER_SIZES[opts.paperSize] || '210mm'
  const pageH = PAPER_HEIGHTS[opts.paperSize] || '297mm'

  const win = window.open('', '_blank')
  if (!win) return

  win.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Noto Serif SC", system-ui, serif;
      line-height: 1.8;
      max-width: ${opts.orientation === 'landscape' ? pageH : pageW};
      margin: 0 auto;
      padding: 15mm 10mm;
      color: var(--text-primary);
      background: var(--bg-overlay);
    }
    h1, h2, h3 { page-break-after: avoid; }
    code { background: var(--bg-code); padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: var(--bg-code); padding: 16px; overflow-x: auto; border-radius: 8px; }
    pre code { background: none; padding: 0; }
    .code-block .ln { color: var(--text-muted); margin-right: 16px; display: inline-block; width: 24px; text-align: right; user-select: none; }
    blockquote { border-left: 3px solid var(--accent-primary); padding: 8px 16px; margin: 16px 0; background: var(--accent-a5); border-radius: 0 8px 8px 0; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid var(--border-default); padding: 8px 12px; }
    th { background: var(--bg-code); }
    .page-footer { text-align: center; font-size: 10pt; color: #888; padding: 10px; border-top: 1px solid var(--border-subtle); margin-top: 40px; }
    @media print {
      body { padding: 10mm; margin: 0; }
      h1, h2, h3 { page-break-after: avoid; }
      pre, table, blockquote { page-break-inside: avoid; }
      .page-footer { position: fixed; bottom: 0; left: 0; right: 0; }
    }
    ${opts.cssVars}
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${finalContent}
  <div class="page-footer">— ${opts.paperSize.toUpperCase()} · ${opts.orientation === 'portrait' ? '纵向' : '横向'} —</div>
</body>
</html>
  `)
  win.document.close()
  win.print()
}

function exportDOCX(title: string, content: string, opts: any): void {
  const tocHTML = opts.includeTOC ? buildTOC(content) : content
  const processed = opts.includeLineNumbers ? addLineNumbers(tocHTML) : tocHTML
  const finalContent = opts.includePageNumbers ? addPageNumbers(processed, opts.paperSize, opts.orientation) : processed
  const pageW = PAPER_SIZES[opts.paperSize] || '210mm'
  const pageH = PAPER_HEIGHTS[opts.paperSize] || '297mm'

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: "Noto Serif SC", serif; font-size: 11pt; line-height: 1.7; }
    h1 { font-size: 22pt; } h2 { font-size: 16pt; } h3 { font-size: 13pt; }
    code { background: #f4f4f4; padding: 1px 4px; border-radius: 3px; font-family: monospace; font-size: 10pt; }
    pre { background: #f4f4f4; padding: 12px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    .code-block .ln { color: #888; margin-right: 12px; }
    blockquote { border-left: 3px solid #39FF9E; padding-left: 14px; margin: 12px 0; color: #555; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 6px 10px; }
    th { background: #f4f4f4; }
    @page { size: ${opts.orientation === 'landscape' ? pageH : pageW} ${opts.orientation === 'landscape' ? pageW : pageH}; margin: 15mm 10mm; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${finalContent}
  <p style="margin-top:30px;font-size:9pt;color:#888;text-align:center">Generated by lzeditor · ${opts.paperSize.toUpperCase()} ${opts.orientation === 'portrait' ? '纵向' : '横向'}</p>
</body>
</html>`

  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.docx`
  a.click()
  URL.revokeObjectURL(url)
}

async function exportEPUB(title: string, content: string, opts: any): Promise<void> {
  const tocHTML = opts.includeTOC ? buildTOC(content) : content
  const processed = opts.includeLineNumbers ? addLineNumbers(tocHTML) : tocHTML
  const finalContent = opts.includePageNumbers ? addPageNumbers(processed, opts.paperSize, opts.orientation) : processed

  const { generateEPUB } = await import('./epubGenerator')
  const chapters = [{ title: '正文', content: finalContent }]
  const blob = await generateEPUB({ title, author: 'lzeditor', chapters })

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.epub`
  a.click()
  URL.revokeObjectURL(url)
}

async function exportPNG(title: string, content: string): Promise<void> {
  const { toPng } = await import('html-to-image')
  const node = document.createElement('div')
  node.style.cssText = 'padding:32px;font-family:"Noto Serif SC",serif;line-height:1.8;font-size:14px;background:#fff;color:#1a1a1a;max-width:800px;margin:0 auto'
  node.innerHTML = `<h1 style="font-size:2em;border-bottom:2px solid #333;padding-bottom:0.3em">${title}</h1>${content}`
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

async function exportSVG(title: string, content: string): Promise<void> {
  const node = document.createElement('div')
  node.style.cssText = 'padding:32px;font-family:"Noto Serif SC",serif;line-height:1.8;font-size:14px;background:#fff;color:#1a1a1a;max-width:800px'
  node.innerHTML = `<h1 style="font-size:2em;border-bottom:2px solid #333;padding-bottom:0.3em">${title}</h1>${content}`
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

function exportXLSX(title: string, content: string): void {
  const { utils, writeFile } = require('xlsx')
  // Extract tables from content
  const tableMatches = content.match(/<table[^>]*>([\s\S]*?)<\/table>/gi) || []
  const rows: string[][] = [['内容']]
  if (tableMatches.length > 0) {
    tableMatches.forEach(tbl => {
      const cells = tbl.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []
      const rowData = cells.map(c => c.replace(/<[^>]+>/g, '').trim())
      if (rowData.length) rows.push(rowData)
    })
  } else {
    const paragraphs = content.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || []
    paragraphs.slice(0, 50).forEach(p => rows.push([p.replace(/<[^>]+>/g, '').trim()]))
  }
  const ws = utils.aoa_to_sheet(rows)
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, '文档内容')
  writeFile(wb, `${title}.xlsx`)
}

function exportDrawio(title: string, content: string): void {
  // Export raw HTML as .drawio for manual import into draw.io
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxGraphModel dx="1422" dy="755" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169">
  <root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    ${content.replace(/<[^>]+>/g, '\n    ')}
  </root>
</mxGraphModel>`
  const blob = new Blob([xml], { type: 'application/vnd.jgraph.mxfile' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.drawio`
  a.click()
  URL.revokeObjectURL(url)
}
