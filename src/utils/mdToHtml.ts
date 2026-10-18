/**
 * Convert markdown to HTML safely, preserving data URIs in images.
 * Works around remark-html bug that drops src from data: URLs.
 */
export function mdToHtml(md: string): string {
  if (!md) return ''
  return convertMarkdownToHtml(md)
}

/** 标题文本 → 稳定的页内锚点 id（中文、英文、数字均可）。 */
export function headingId(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\w\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
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

/** 提取围栏代码块，返回把代码块替换成 %%CODEBLOCK_n%% 占位符后的文本。 */
function extractFencedCodeBlocks(md: string, out: string[]): string {
  const lines = md.split('\n')
  const result: string[] = []
  let i = 0

  while (i < lines.length) {
    const m = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)\s*$/.exec(lines[i])
    if (!m) {
      result.push(lines[i])
      i++
      continue
    }

    const fence = m[1]
    const fenceLen = fence.length
    const lang = m[2]
    const closeRe = new RegExp('^ {0,3}' + (fence[0] === '`' ? '`' : '~') + `{${fenceLen},}\\s*$`)

    let j = i + 1
    while (j < lines.length && !closeRe.test(lines[j])) j++

    // 围栏没闭合就原样保留，避免把后半篇文档都吞进代码块
    if (j >= lines.length) {
      result.push(lines[i])
      i++
      continue
    }

    const code = lines.slice(i + 1, j).join('\n')
    out.push(`<pre><code${lang ? ` class="language-${escapeHtml(lang)}"` : ''}>${escapeHtml(code)}</code></pre>`)
    result.push(`%%CODEBLOCK_${out.length - 1}%%`)
    i = j + 1
  }

  return result.join('\n')
}

function convertMarkdownToHtml(md: string): string {
  let html = md.replace(/\r/g, '')

  // ── Code blocks (fenced) ──
  // 支持 3 个及以上的 ``` 和 ~~~，并保证闭合围栏的长度不小于起始围栏。
  // 之前用 /```(\w*)\n([\s\S]*?)```/ 有两个问题：
  //   1. 四个反引号包裹三反引号内容的写法（手册 B07 就在用）会被先切开；
  //   2. 语言标签 \w* 匹配不全，c++ / object-c 这类会被截断。
  const codeBlocks: string[] = []
  html = extractFencedCodeBlocks(html, codeBlocks)

  // ── Inline code ──
   html = html.replace(/`([^`\n]+)`/g, (_m: string, code: string) => `<code>${escapeHtml(code)}</code>`)

   // ── Headings (带锚点 id，供页内跳转与内部链接使用) ──
   const headingSeen = new Map<string, number>()
   const headingAnchor = (text: string) => {
     let base = headingId(text)
     if (!base) base = 'section'
     const n = headingSeen.get(base) || 0
     headingSeen.set(base, n + 1)
     return n ? `${base}-${n + 1}` : base
   }
   html = html.replace(/^(#{1,6})[ \t]*(.+)$/gm, (_m: string, hashes: string, text: string) => {
     const level = hashes.length
     return `<h${level} id="${headingAnchor(text)}">${text}</h${level}>`
   })

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
  // 注意：这里不能写 ^[\s\S]*? —— [\s\S] 会跨行，把前面的 <h1>/<h2> 全部
  // 当成正则的「前导内容」一起吃掉，整篇文档的标题就没了。
  // 只允许行内空白缩进。
   html = html.replace(/^[ \t]*[-*+]\s+(.+)$/gm, (_m: string, text: string) => `<li>${text}</li>`)
   html = html.replace(/^[ \t]*\d+\.\s+(.+)$/gm, (_m: string, text: string) => `<li>${text}</li>`)

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
