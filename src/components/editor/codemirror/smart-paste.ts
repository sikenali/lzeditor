import { EditorView } from '@codemirror/view'
import { Transaction } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'

const LINK_NODES = new Set(['Link', 'Image', 'Autolink', 'URL'])

function hasAncestor(state: any, pos: number, side: 1 | -1, names: Set<string>): boolean {
  const tree = syntaxTree(state)
  let node: SyntaxNode | null = tree.resolveInner(pos, side)
  while (node) {
    if (names.has(node.name)) return true
    node = node.parent
  }
  return false
}

function insideCode(state: any, pos: number): boolean {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 1)
  while (node) {
    if (node.name === 'InlineCode' || node.name === 'FencedCode' || node.name === 'CodeBlock') return true
    node = node.parent
  }
  return false
}

const URL_RE = /^(?:https?:\/\/|mailto:)\S+$/i

function singleUrl(text: string): string | null {
  const trimmed = text.trim()
  return URL_RE.test(trimmed) ? trimmed : null
}

function isExcelHtml(html: string): boolean {
  return (
    /xmlns:x\s*=\s*["']?urn:schemas-microsoft-com:office:excel/i.test(html) ||
    /<meta[^>]*name\s*=\s*["']?ProgId["']?[^>]*content\s*=\s*["']?Excel/i.test(html)
  )
}

function tsvRows(text: string): string[][] | null {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  if (lines.length < 2) return null
  const rows = lines.map((line) => line.split('\t'))
  const width = rows[0]?.length ?? 0
  if (width < 2) return null
  return rows.every((row) => row.length === width) ? rows : null
}

function rowsFromHtml(html: string): string[][] | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table = doc.querySelector('table')
  if (!table) return null
  const rows: string[][] = []
  for (const tr of Array.from(table.querySelectorAll('tr'))) {
    const cells = Array.from(tr.querySelectorAll(':scope > td, :scope > th'))
    if (cells.length === 0) continue
    rows.push(
      cells.map((cell) =>
        (cell.textContent ?? '')
          .replace(/ /g, ' ')
          .replace(/\s*\n\s*/g, '\n')
          .trim(),
      ),
    )
  }
  return rows.length > 0 ? rows : null
}

const pipeCell = (cell: string) =>
  cell
    .replace(/(\\*)\|/g, (_, slashes: string) => `${slashes}${slashes}\\|`)
    .replace(/\n/g, '<br>')

function tableFromRows(rows: string[][]): string {
  const width = Math.max(...rows.map((row) => row.length))
  const full = rows.map((row) => [...row, ...Array<string>(width - row.length).fill('')])
  const line = (row: string[]) => `| ${row.map(pipeCell).join(' | ')} |`
  return [
    line(full[0] ?? []),
    line(Array<string>(width).fill('---')),
    ...full.slice(1).map(line),
  ].join('\n')
}

function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return ''
  const temp = document.createElement('div')
  temp.innerHTML = html.trim()

  function convertNode(node: Node): string {
    if (node.nodeType === 3) return node.textContent ?? ''
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()
    const children = Array.from(el.childNodes).map(convertNode).join('')
    const inner = children.trim()

    switch (tag) {
      case 'h1': return `\n# ${inner}\n`
      case 'h2': return `\n## ${inner}\n`
      case 'h3': return `\n### ${inner}\n`
      case 'h4': return `\n#### ${inner}\n`
      case 'h5': return `\n##### ${inner}\n`
      case 'h6': return `\n###### ${inner}\n`
      case 'p': return `\n${inner}\n`
      case 'br': return '\n'
      case 'strong': case 'b': return `**${inner}**`
      case 'em': case 'i': return `*${inner}*`
      case 'del': case 's': case 'strike': return `~~${inner}~~`
      case 'code': {
        const parent = el.parentElement
        if (parent?.tagName.toLowerCase() === 'pre') return inner
        return `\`${inner}\``
      }
      case 'pre': {
        const code = el.querySelector('code')
        return `\n\`\`\`\n${(code?.textContent ?? inner).trim()}\n\`\`\`\n`
      }
      case 'blockquote': return `\n${inner.split('\n').map(l => `> ${l}`).join('\n')}\n`
      case 'ul': return `\n${inner}\n`
      case 'ol': return `\n${inner}\n`
      case 'li': return `- ${inner}\n`
      case 'a': {
        const href = el.getAttribute('href') ?? ''
        return `[${inner}](${href})`
      }
      case 'img': {
        const src = el.getAttribute('src') ?? ''
        const alt = el.getAttribute('alt') ?? ''
        return `![${alt}](${src})`
      }
      case 'table': {
        const tRows: string[][] = []
        for (const tr of el.querySelectorAll('tr')) {
          const cells = Array.from(tr.querySelectorAll('td, th')).map(c => (c.textContent ?? '').trim())
          if (cells.length > 0) tRows.push(cells)
        }
        if (tRows.length === 0) return inner
        return tableFromRows(tRows)
      }
      case 'hr': return '\n---\n'
      default: return inner
    }
  }

  return convertNode(temp).replace(/\n{3,}/g, '\n\n').trim()
}

async function replacement(
  kind: string,
  selectedText: string,
  html: string,
  _uri: string,
  text: string,
): Promise<string | null> {
  switch (kind) {
    case 'link': {
      const url = singleUrl(text)
      if (!url) return null
      return `[${selectedText}](${url})`
    }
    case 'table-tsv': {
      const rows = tsvRows(text)
      if (!rows) return null
      return tableFromRows(rows)
    }
    case 'table-html': {
      const rows = rowsFromHtml(html)
      if (!rows) return null
      return tableFromRows(rows)
    }
    case 'html': {
      const markdown = htmlToMarkdown(html)
      return markdown.trim() === '' ? null : markdown
    }
    default:
      return null
  }
}

export function setupSmartPaste(view: EditorView): void {
  const onPaste = (event: ClipboardEvent) => {
    const data = event.clipboardData
    if (!data) return
    const state = view.state
    if (state.readOnly || state.selection.ranges.length !== 1) return

    const text = data.getData('text/plain')
    const html = data.getData('text/html')
    if (text === '' && html === '') return

    const { from, to } = state.selection.main
    const selectedText = state.sliceDoc(from, to)
    const inCode = insideCode(state, from) || (to !== from && insideCode(state, to))
    const selectionIsLink =
      from !== to &&
      (hasAncestor(state, from, 1, LINK_NODES) || hasAncestor(state, to, -1, LINK_NODES))

    if (inCode) return

    let kind: string | null = null
    const url = singleUrl(text)
    if (url && selectedText !== '' && !selectedText.includes('\n') && !selectionIsLink) {
      kind = 'link'
    } else if (html && isExcelHtml(html)) {
      kind = 'table-html'
    } else if (!html.trim()) {
      const rows = tsvRows(text)
      if (rows) kind = 'table-tsv'
    } else if (html.trim()) {
      kind = 'html'
    }

    if (!kind) return

    event.preventDefault()
    const plainText = text !== '' ? text : html
    const plain = state.update(state.replaceSelection(plainText), {
      userEvent: 'input.paste',
      scrollIntoView: true,
    })
    view.dispatch(plain)
    const pastedTo = plain.newSelection.main.head

    void replacement(kind, selectedText, html, '', text).then((markdown) => {
      if (markdown === null || view.state.doc !== plain.state.doc) return
      view.dispatch({
        changes: { from, to: pastedTo, insert: markdown },
        selection: { anchor: from + markdown.length },
        userEvent: 'input.paste',
        scrollIntoView: true,
        annotations: [Transaction.addToHistory.of(true)],
      })
    }).catch(() => {})
  }

  view.dom.addEventListener('paste', onPaste)
  ;(view.dom as any)._smartPasteHandler = onPaste
}

export function teardownSmartPaste(view: EditorView): void {
  const handler = (view.dom as any)._smartPasteHandler
  if (handler) {
    view.dom.removeEventListener('paste', handler)
    delete (view.dom as any)._smartPasteHandler
  }
}
