/**
 * Convert markdown to HTML safely, preserving data URIs in images.
 * Works around remark-html bug that drops src from data: URLs.
 */
export function mdToHtml(md: string): string {
  if (!md) return ''

  // Check if content contains data URIs
  const hasDataUri = /!\[[^\]]*\]\(data:[^\)]+\)/.test(md)

  if (!hasDataUri) {
    // Fast path: use remark for normal content
    try {
      const { remark } = require('remark')
      const remarkGfm = require('remark-gfm').default
      const remarkHtml = require('remark-html').default
      return remark().use(remarkGfm).use(remarkHtml).processSync(md).toString()
    } catch {
      // Fallback to regex converter
    }
  }

  // Custom converter that handles data URIs correctly
  return convertMarkdownToHtml(md)
}

function convertMarkdownToHtml(md: string): string {
  let html = md

  // Escape HTML special chars (except in code blocks)
  const codeBlocks: string[] = []
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m: string, lang: string, code: string) => {
    const idx = codeBlocks.length
    codeBlocks.push(`<pre><code${lang ? ` class="language-${lang}"` : ''}>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`)
    return `%%CODEBLOCK_${idx}%%`
  })

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>')

  // Headings
  html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')

  // Horizontal rule
  html = html.replace(/^(---+|\*\*\*+|___+)\s*$/gm, '<hr>')

  // Blockquote
  html = html.replace(/^(>\s?.+$(?:\n>\s?.+$)*)/gm, (_m: string, block: string) => {
    const lines = block.split('\n').map((l: string) => l.replace(/^>\s?/, '')).join('')
    return `<blockquote><p>${lines}</p></blockquote>`
  })

  // Tables
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

  // Images - preserve data URIs
  html = html.replace(/!\[([^\]]*)\]\((data:[^\)]+)\)/g, '<img src="$2" alt="$1">')
  html = html.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1">')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Bold + Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')

  // Task lists
  html = html.replace(/^- \[x\]\s+(.+)$/gmi, '<li class="task-item checked"><input type="checkbox" checked disabled> $1</li>')
  html = html.replace(/^- \[\s\]\s+(.+)$/gmi, '<li class="task-item"><input type="checkbox" disabled> $1</li>')

  // List items
  html = html.replace(/^[^\-\*\d>]\s*[-*+]\s+(.+)$/gm, '<li>$1</li>')
  html = html.replace(/^[^\d>]\s*\d+\.\s+(.+)$/gm, '<li>$1</li>')

  // Wrap consecutive <li>
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match: string) => {
    if (match.includes('task-item')) return `<ul>${match}</ul>`
    if (/^\s*\d+\./.test(match)) return `<ol>${match}</ol>`
    return `<ul>${match}</ul>`
  })

  // Paragraphs
  html = html.replace(/^(?!<[a-z])(?!%%CODEBLOCK)([^\n]+)$/gm, '<p>$1</p>')
  html = html.replace(/<\/p>\s*<p>/g, '\n')

  // Restore code blocks
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`%%CODEBLOCK_${idx}%%`, block)
  })

  // Clean up
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
