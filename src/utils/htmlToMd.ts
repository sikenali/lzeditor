export function htmlToMarkdown(html: string): string {
  if (!html) return ''
  let md = html
    // Headings
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')
    .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n')
    .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n')
    // Blockquote
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n')
    // HR
    .replace(/<hr[^>]*\/?>/gi, '\n---\n')
    // Code blocks
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '\n```\n$1\n```\n')
    // Tables
    .replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_match: string, body: string) => {
      const rows = body.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || []
      if (rows.length === 0) return ''
      const parseRow = (row: string) =>
        (row.match(/<t[hde][^>]*>([\s\S]*?)<\/t[hde]>/gi) || [])
          .map((c: string) => c.replace(/<[^>]+>/g, '').trim())
          .join(' | ')
      const headers = parseRow(rows[0])
      const sep = headers.split('|').map(() => '---').filter(Boolean).join('|')
      const lines = rows.slice(1).map(parseRow)
      return '\n| ' + headers + ' |\n| ' + sep + ' |\n' + lines.map(l => '| ' + l + ' |').join('\n') + '\n'
    })
    // List items
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
    // Paragraphs
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
    // Inline
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, '~~$1~~')
    .replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, '~~$1~~')
    .replace(/<strike[^>]*>([\s\S]*?)<\/strike>/gi, '~~$1~~')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
    // Clean up
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n\s*\n/g, '\n\n')
    .trim()
  return md
}
