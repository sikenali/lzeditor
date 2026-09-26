/**
 * Convert markdown to HTML safely, preserving data URIs in images.
 * Works around remark-html bug that drops src from data: URLs.
 */
export function mdToHtml(md: string): string {
  if (!md) return ''
  return convertMarkdownToHtml(md)
}

/** Find the index of the closing paren that matches the opening paren at `start`. */
function findMatchingParen(str: string, start: number): number {
  let depth = 1
  for (let i = start + 1; i < str.length; i++) {
    if (str[i] === '(') depth++
    else if (str[i] === ')') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function convertMarkdownToHtml(md: string): string {
  let html = md

  // ── Code blocks (fenced) ──
  const codeBlocks: string[] = []
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m: string, lang: string, code: string) => {
    const idx = codeBlocks.length
    codeBlocks.push(`<pre><code${lang ? ` class="language-${lang}"` : ''}>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`)
    return `%%CODEBLOCK_${idx}%%`
  })

  // ── Inline code ──
   html = html.replace(/`([^`\n]+)`/g, (_m: string, code: string) => `<code>${escapeHtml(code)}</code>`)

  // ── Headings ──
   html = html.replace(/^######\s+(.+)$/gm, (_m: string, text: string) => `<h6>${text}</h6>`)
   html = html.replace(/^#####\s+(.+)$/gm, (_m: string, text: string) => `<h5>${text}</h5>`)
   html = html.replace(/^####\s+(.+)$/gm, (_m: string, text: string) => `<h4>${text}</h4>`)
   html = html.replace(/^###\s+(.+)$/gm, (_m: string, text: string) => `<h3>${text}</h3>`)
   html = html.replace(/^##\s+(.+)$/gm, (_m: string, text: string) => `<h2>${text}</h2>`)
   html = html.replace(/^#\s+(.+)$/gm, (_m: string, text: string) => `<h1>${text}</h1>`)

  // ── Horizontal rule ──
  html = html.replace(/^(---+|\*\*\*+|___+)\s*$/gm, '<hr>')

  // ── Blockquote ──
  html = html.replace(/^(>\s?.+$(?:\n>\s?.+$)*)/gm, (_m: string, block: string) => {
    const lines = block.split('\n').map((l: string) => l.replace(/^>\s?/, '')).join('')
    return `<blockquote><p>${lines}</p></blockquote>`
  })

  // ── Tables ──
  html = html.replace(/((?:^|[ \t]*\n)[ \t]*\|.+[ \t]*\n(?:[ \t]*\|[ \t]*:?-+[ \t]*:?[ \t]*|[ \t]*\|.*)\n(?:[ \t]*\|.+\n?)*)/gm, (_m: string, table: string) => {
    const lines = table.trim().split('\n').filter((l: string) => l.trim())
    if (lines.length < 2) return table
    const parseCell = (line: string) => line.split('|').slice(1, -1).map((c: string) => c.trim())
    const headers = parseCell(lines[0])
    const aligns = parseCell(lines[1]).map((c: string) => {
      if (c.startsWith(':') && c.endsWith(':')) return 'center'
      if (c.endsWith(':')) return 'right'
      return 'left'
    })
    let result = '<table><thead><tr>'
    headers.forEach((h: string, i: number) => {
      result += aligns[i] ? `<th align="${aligns[i]}">${h}</th>` : `<th>${h}</th>`
    })
    result += '</tr></thead><tbody>'
    for (let i = 2; i < lines.length; i++) {
      const cells = parseCell(lines[i])
      result += '<tr>'
      cells.forEach((c: string, idx: number) => {
        result += aligns[idx] ? `<td align="${aligns[idx]}">${c}</td>` : `<td>${c}</td>`
      })
      result += '</tr>'
    }
    result += '</tbody></table>'
    return result
  })

  // ── Images with paren-aware closing-paren matching ──
  // Data URIs like url(#g) contain ')' which breaks naive [^) regexes
  const imageResult: string[] = []
  let imageIdx = 0
  html = html.replace(/!\[([^\]]*)\]\(/g, (_match: string, alt: string, offset: number, source: string) => {
    const closeIdx = findMatchingParen(source, offset)
    if (closeIdx === -1) return _match // malformed, leave as-is
    const url = source.slice(offset + 1, closeIdx)
    imageResult[imageIdx] = `<img src="${url}" alt="${alt}">`
    const result = `%%IMG_${imageIdx}%%`
    imageIdx++
    return result
  })
  imageResult.forEach((img, idx) => {
    html = html.replace(`%%IMG_${idx}%%`, img)
  })

  // ── Links ──
   html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m: string, text: string, url: string) => `<a href="${url}">${text}</a>`)

  // ── Bold + Italic ──
   html = html.replace(/\*\*\*(.+?)\*\*\*/g, (_m: string, text: string) => `<strong><em>${text}</em></strong>`)
   html = html.replace(/___(.+?)___/g, (_m: string, text: string) => `<strong><em>${text}</em></strong>`)
   html = html.replace(/\*\*(.+?)\*\*/g, (_m: string, text: string) => `<strong>${text}</strong>`)
   html = html.replace(/__(.+?)__/g, (_m: string, text: string) => `<strong>${text}</strong>`)
   html = html.replace(/\*(.+?)\*/g, (_m: string, text: string) => `<em>${text}</em>`)
   html = html.replace(/_(.+?)_/g, (_m: string, text: string) => `<em>${text}</em>`)
   html = html.replace(/~~(.+?)~~/g, (_m: string, text: string) => `<del>${text}</del>`)

  // ── Task lists ──
   html = html.replace(/^- \[x\]\s+(.+)$/gmi, (_m: string, text: string) => `<li class="task-item checked"><input type="checkbox" checked disabled> ${text}</li>`)
   html = html.replace(/^- \[\s\]\s+(.+)$/gmi, (_m: string, text: string) => `<li class="task-item"><input type="checkbox" disabled> ${text}</li>`)

  // ── List items (支持 emoji 前缀如 * 📝 ...) ──
   html = html.replace(/^[\s\S]*?[-*+]\s+(.+)$/gm, (_m: string, text: string) => `<li>${text}</li>`)
   html = html.replace(/^[\s\S]*?\d+\.\s+(.+)$/gm, (_m: string, text: string) => `<li>${text}</li>`)

  // ── Wrap consecutive <li> ──
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match: string) => {
    if (match.includes('task-item')) return `<ul>${match}</ul>`
    if (/^\s*\d+\./.test(match)) return `<ol>${match}</ol>`
    return `<ul>${match}</ul>`
  })

  // ── Paragraphs ──
   html = html.replace(/^(?!<[a-z])(?!%%CODEBLOCK)([^\n]+)$/gm, (_m: string, text: string) => `<p>${text}</p>`)
  html = html.replace(/<\/p>\s*<p>/g, '\n')

  // ── Restore code blocks ──
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`%%CODEBLOCK_${idx}%%`, block)
  })

  // ── Clean up ──
  html = html.replace(/\n{3,}/g, '\n\n')

  return html.trim()
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
