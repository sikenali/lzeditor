
export interface ExportOptions {
  title: string
  author?: string
  content: string
  format: 'pdf' | 'html' | 'docx' | 'epub' | 'md'
  options?: {
    styleSet?: string
    includeTOC?: boolean
    includeLineNumbers?: boolean
    includePageNumbers?: boolean
    paperSize?: string
    orientation?: string
  }
}

const PAPER_SIZES: Record<string, string> = {
  a4: '210mm', a3: '297mm', a5: '148mm', letter: '216mm', legal: '216mm',
}
const PAPER_HEIGHTS: Record<string, string> = {
  a4: '297mm', a3: '420mm', a5: '210mm', letter: '279mm', legal: '356mm',
}

const THEME_VARS: Record<string, Record<string, string>> = {
  ocean:      { primary: '#4fc3f7', text: '#e0e6ed', muted: '#7a8a9a', heading: '#f0f4f8', code: '#1a2634', overlay: '#0d1b2a', border: '#2a3a4a', amber: '#ffb347' },
  'neon-dark':{ primary: '#39ff9e', text: '#e8f5e9', muted: '#6d9b7a', heading: '#f1f8e9', code: '#1a2e1a', overlay: '#0f1a0f', border: '#2a4a2a', amber: '#ffeb3b' },
  graphite:   { primary: '#ff9800', text: '#eceff1', muted: '#90a4ae', heading: '#fafafa', code: '#263238', overlay: '#1c2833', border: '#37474f', amber: '#ffcc02' },
  sakura:     { primary: '#f48fb1', text: '#37474f', muted: '#78909c', heading: '#263238', code: '#fce4ec', overlay: '#fff0f5', border: '#f8bbd0', amber: '#ff8f00' },
  mint:       { primary: '#4caf50', text: '#263238', muted: '#607d8b', heading: '#1b5e20', code: '#e8f5e9', overlay: '#f1f8e9', border: '#c8e6c9', amber: '#ff9800' },
  minimal:    { primary: '#2196f3', text: '#212121', muted: '#757575', heading: '#0d47a1', code: '#f5f5f5', overlay: '#fafafa', border: '#e0e0e0', amber: '#f57c00' },
}
const DEFAULT_VARS = THEME_VARS.ocean

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function getCSSVars(styleSetName: string): string {
  const v = THEME_VARS[styleSetName] || DEFAULT_VARS
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

/** Render content into off-screen DOM, inline all computed styles, return self-contained HTML. */
function buildStyledHTML(title: string, content: string, opts: any): string {
  const pageW = PAPER_SIZES[opts.paperSize] || '210mm'
  const pageH = PAPER_HEIGHTS[opts.paperSize] || '297mm'
  const v = THEME_VARS[opts.styleSet] || THEME_VARS.ocean
  const container = document.createElement('div')
  container.style.cssText = `position:fixed;left:-9999px;top:0;width:${opts.orientation==='landscape'?'1200px':'800px'};background:${v.overlay};color:${v.text};font-family:"Noto Serif SC",system-ui,serif;line-height:1.8;padding:20px;font-size:14px`
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
  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;600;700&family=JetBrains+Mono&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:"Noto Serif SC","Source Han Serif SC",system-ui,serif;line-height:1.8;max-width:${opts.orientation==='landscape'?pageH:pageW};margin:0 auto;padding:20px;background:${v.overlay};color:${v.text}}h1,h2,h3,h4{font-weight:600;line-height:1.3}h1{font-size:2em;margin:0.67em 0;border-bottom:2px solid ${v.primary};padding-bottom:0.3em}h2{font-size:1.5em;margin:0.83em 0}h3{font-size:1.17em;margin:1em 0}p{margin:0.5em 0}code{font-family:"JetBrains Mono",monospace;background:${v.code};padding:2px 6px;border-radius:4px;font-size:0.88em}pre{background:${v.code};padding:16px;overflow-x:auto;border-radius:8px;border:1px solid ${v.border};margin:12px 0}pre code{background:none;padding:0}blockquote{border-left:3px solid ${v.primary};padding:8px 16px;margin:16px 0;background:${accentA5};border-radius:0 8px 8px 0}table{border-collapse:collapse;width:100%;margin:16px 0}th,td{border:1px solid ${v.border};padding:8px 12px}th{background:${v.code}}ul,ol{padding-left:24px;margin:8px 0}li{margin:4px 0}hr{border:none;height:1px;background:${v.border};margin:24px 0}a{color:${v.primary};text-decoration:none}a:hover{text-decoration:underline}img{max-width:100%;height:auto;border-radius:8px}@media print{body{padding:10mm}}</style></head><body>${innerHTML}</body></html>`
}

export async function exportDocument(options: ExportOptions): Promise<void> {
  const { title, content, format, options: expOpts = {} } = options
  const styleSet = expOpts.styleSet || 'ocean'
  const includeTOC = expOpts.includeTOC !== false
  const includeLineNumbers = expOpts.includeLineNumbers || false
  const includePageNumbers = expOpts.includePageNumbers || false
  const paperSize = expOpts.paperSize || 'a4'
  const orientation = expOpts.orientation || 'portrait'
  const cssVars = getCSSVars(styleSet)

  switch (format) {
    case 'html':
      exportHTML(title, content, { cssVars, includeTOC, includeLineNumbers, includePageNumbers, paperSize, orientation })
      break
    case 'md':
      exportMarkdown(title, content)
      break
    case 'pdf':
      await exportPDF(title, content, { cssVars, includeTOC, includeLineNumbers, includePageNumbers, paperSize, orientation })
      break
    case 'docx':
      exportDOCX(title, content, { cssVars, includeTOC, includeLineNumbers, includePageNumbers, paperSize, orientation })
      break
    case 'epub':
      await exportEPUB(title, content, { cssVars, includeTOC, includeLineNumbers, includePageNumbers, paperSize, orientation })
      break
  }
}

function exportHTML(title: string, content: string, opts: any): void {
  const processed = opts.includeLineNumbers ? addLineNumbers(content) : content
  const finalContent = opts.includePageNumbers ? addPageNumbers(processed, opts.paperSize, opts.orientation) : processed
  const html = buildStyledHTML(title, finalContent, { ...opts, styleSet: opts.styleSet || 'ocean' })
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

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.doc`
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
