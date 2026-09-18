import type { Theme } from '../styles/themes'
import { THEMES } from '../styles/themes'

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

function getCSSVariables(styleSetName: string): string {
  const theme = THEMES.find(t => t.id === styleSetName) || THEMES[0]
  const c = theme.colors
  return `
    --accent-primary: ${c.accentPrimary};
    --accent-a5: ${c.accentSoft};
    --accent-a10: ${c.accentSoft.replace(/[\d.]+\)$/, '0.1)');
    --accent-a15: ${c.accentSoft.replace(/[\d.]+\)$/, '0.15)');
    --accent-a40: ${c.accentSoft.replace(/[\d.]+\)$/, '0.4)');
    --accent-a30: ${c.accentSoft.replace(/[\d.]+\)$/, '0.3)');
    --text-primary: ${c.textPrimary};
    --text-secondary: ${c.textSecondary};
    --text-muted: ${c.textMuted};
    --text-heading: ${c.textPrimary};
    --text-heading-2: ${c.textPrimary};
    --bg-code: ${c.bgCode};
    --bg-overlay: ${c.bgSecondary};
    --border-default: ${c.borderDefault};
    --border-subtle: ${c.borderSubtle};
    --border-lighter: ${c.borderDefault};
    --amber: ${c.amber};
    --success-bg: ${c.bgCode};
    --success-border: ${c.borderDefault};
    --red-soft: rgba(200,50,50,0.1);
    --red-text: #c43d3d;
  `
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
  return html.replace(/<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/gi, (_m, lang, code) => {
    const lines = code.split('\n')
    const numbered = lines.map((line, i) =>
      `<span class="ln">${i + 1}</span><span class="lc">${line}</span>`
    ).join('\n')
    return `<pre class="code-block" data-lang="${lang}"><code>${numbered}</code></pre>`
  }).replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, (_m, code) => {
    const lines = code.split('\n')
    const numbered = lines.map((line, i) =>
      `<span class="ln">${i + 1}</span><span class="lc">${line}</span>`
    ).join('\n')
    return `<pre class="code-block"><code>${numbered}</code></pre>`
  })
}

export async function exportDocument(options: ExportOptions): Promise<void> {
  const { title, content, format, options: expOpts = {} } = options
  const styleSet = expOpts.styleSet || 'ocean'
  const includeTOC = expOpts.includeTOC !== false
  const includeLineNumbers = expOpts.includeLineNumbers || false
  const includePageNumbers = expOpts.includePageNumbers || false
  const paperSize = expOpts.paperSize || 'a4'
  const orientation = expOpts.orientation || 'portrait'
  const cssVars = getCSSVariables(styleSet)

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
  const tocHTML = opts.includeTOC ? buildTOC(content) : content
  const processed = opts.includeLineNumbers ? addLineNumbers(tocHTML) : tocHTML
  const finalContent = opts.includePageNumbers ? addPageNumbers(processed, opts.paperSize, opts.orientation) : processed

  const pageW = PAPER_SIZES[opts.paperSize] || '210mm'
  const pageH = PAPER_HEIGHTS[opts.paperSize] || '297mm'
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Noto Serif SC", "Source Han Serif SC", system-ui, serif;
      line-height: 1.8;
      max-width: ${opts.orientation === 'landscape' ? pageH : pageW};
      margin: 0 auto;
      padding: 20px;
      color: var(--text-primary);
      background: var(--bg-overlay);
    }
    h1, h2, h3, h4 { color: var(--text-primary); }
    code { background: var(--bg-code); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: var(--amber); }
    pre { background: var(--bg-code); padding: 16px; overflow-x: auto; border-radius: 8px; border: 1px solid var(--border-subtle); }
    pre code { background: none; padding: 0; color: var(--text-primary); }
    .code-block { position: relative; }
    .code-block .ln { color: var(--text-muted); user-select: none; margin-right: 16px; display: inline-block; width: 24px; text-align: right; }
    .code-block .lc { white-space: pre; }
    blockquote { border-left: 3px solid var(--accent-primary); padding: 8px 16px; margin: 16px 0; background: var(--accent-a5); border-radius: 0 8px 8px 0; color: var(--text-secondary); }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid var(--border-default); padding: 8px 12px; }
    th { background: var(--bg-code); color: var(--text-primary); }
    tr:hover td { background: var(--accent-a5); }
    .page-footer { text-align: center; font-size: 10pt; color: #888; padding: 10px; border-top: 1px solid var(--border-subtle); margin-top: 40px; }
    @media print { body { padding: 10mm; } }
    ${opts.cssVars}
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${finalContent}
  <footer style="margin-top:40px;padding-top:20px;border-top:1px solid var(--border-subtle);color:var(--text-muted);font-size:12px;text-align:center">Generated by lzeditor · ${opts.paperSize.toUpperCase()} ${opts.orientation === 'portrait' ? '纵向' : '横向'}</footer>
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html' })
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
