/**
 * Markdown 源码级表格操作（代码模式）。
 *
 * GFM 表格首行恒为表头、第二行是分隔行；「切换标题行」实现为把表头与
 * 第一条数据行对调（分隔行保持原位），这是 markdown 能表达的“换标题行”。
 * 删除表格直接删整块源码。
 */

export type TableOp =
  | 'insert-column-left'
  | 'insert-column-right'
  | 'insert-row-below'
  | 'delete-column'
  | 'delete-row'
  | 'toggle-header-row'
  | 'delete-table'

export interface ParsedTable {
  /** 表格块在源码中的 [from, to) 区间（不含末尾换行）。 */
  from: number
  to: number
  lines: string[]
  /** 数据行（表头 + 数据行），不含分隔行。 */
  rows: string[][]
  /** 分隔行单元格（保留对齐标记）。 */
  delimiter: string[]
  delimiterIndex: number
  rowIndex: number
  colIndex: number
}

export interface TableEdit {
  from: number
  to: number
  text: string
}

const isTableLine = (line: string) => /^\s*\|/.test(line)

/** 拆分一行表格为单元格，处理 `\|` 转义。 */
function splitCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let cur = ''
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]
    if (ch === '\\' && trimmed[i + 1] === '|') {
      cur += '\\|'
      i++
    } else if (ch === '|') {
      cells.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  cells.push(cur.trim())
  return cells
}

/** 写回一行表格（单元格两侧留一个空格）。 */
function joinCells(cells: string[]): string {
  return `| ${cells.join(' | ')} |`
}

const isDelimiterCell = (cell: string) => /^:?-{1,}:?$/.test(cell.trim())

function findTableBlock(source: string, offset: number): { start: number; end: number; lines: string[]; offsetInBlock: number } | null {
  const before = source.slice(0, offset)
  let lineStart = before.lastIndexOf('\n') + 1
  const lineEnd = source.indexOf('\n', lineStart)
  const firstLineEnd = lineEnd === -1 ? source.length : lineEnd
  if (!isTableLine(source.slice(lineStart, firstLineEnd))) return null

  let start = lineStart
  while (start > 0) {
    const prevStart = source.lastIndexOf('\n', start - 2) + 1
    if (prevStart === start) break
    const prevEnd = start - 1
    if (!isTableLine(source.slice(prevStart, prevEnd))) break
    start = prevStart
  }
  let end = firstLineEnd
  while (end < source.length) {
    const nextStart = end + 1
    const nextEnd = source.indexOf('\n', nextStart)
    const stop = nextEnd === -1 ? source.length : nextEnd
    if (!isTableLine(source.slice(nextStart, stop))) break
    end = stop
  }
  return {
    start,
    end,
    lines: source.slice(start, end).split('\n'),
    offsetInBlock: offset - start,
  }
}

/** 解析光标所在的表格块；不在表格内返回 null。 */
export function parseTableAt(source: string, offset: number): ParsedTable | null {
  const block = findTableBlock(source, offset)
  if (!block) return null
  const delimiterIndex = block.lines.findIndex((line) => splitCells(line).every(isDelimiterCell))
  if (delimiterIndex <= 0) return null

  const rows: string[][] = []
  const rowLineIndexes: number[] = []
  block.lines.forEach((line, i) => {
    if (i === delimiterIndex) return
    rows.push(splitCells(line))
    rowLineIndexes.push(i)
  })
  if (rows.length === 0) return null

  // 光标所在行 → 数据行下标；在分隔行上时按表头处理。
  let cursorLine = 0
  let acc = 0
  for (let i = 0; i < block.lines.length; i++) {
    const len = block.lines[i].length
    if (block.offsetInBlock <= acc + len) { cursorLine = i; break }
    acc += len + 1
  }
  const rowIndex = cursorLine === delimiterIndex ? 0 : rowLineIndexes.indexOf(cursorLine)
  const lineText = block.lines[cursorLine] ?? ''
  const offsetInLine = block.offsetInBlock - (block.lines.slice(0, cursorLine).reduce((a, l) => a + l.length + 1, 0))
  const pipesBefore = (lineText.slice(0, Math.max(0, offsetInLine)).match(/\|/g) || []).length
  const colIndex = Math.max(0, Math.min(rows[rowIndex]?.length ? rows[rowIndex].length - 1 : 0, pipesBefore - 1))

  return {
    from: block.start,
    to: block.end,
    lines: block.lines,
    rows,
    delimiter: splitCells(block.lines[delimiterIndex]),
    delimiterIndex,
    rowIndex: Math.max(0, rowIndex),
    colIndex,
  }
}

/** 应用表格操作，返回要替换的源码区间与新文本；不在表格/无效操作返回 null。 */
export function applyTableOp(source: string, offset: number, op: TableOp): TableEdit | null {
  const table = parseTableAt(source, offset)
  if (!table) return null
  const { rows, delimiter, rowIndex, colIndex, delimiterIndex } = table

  if (op === 'delete-table') {
    let from = table.from
    let to = table.to
    if (from > 0 && source[from - 1] === '\n') from -= 1
    if (to < source.length && source[to] === '\n') to += 1
    return { from, to, text: '' }
  }

  const cols = Math.max(...rows.map((r) => r.length), delimiter.length)
  const rebuild = (nextRows: string[][], nextDelimiter: string[]): TableEdit => {
    const lines = nextRows.map(joinCells)
    lines.splice(delimiterIndex, 0, joinCells(nextDelimiter))
    return { from: table.from, to: table.to, text: lines.join('\n') }
  }

  if (op === 'insert-column-left' || op === 'insert-column-right') {
    const at = op === 'insert-column-left' ? colIndex : colIndex + 1
    const nextRows = rows.map((r) => {
      const copy = [...r]
      copy.splice(Math.min(at, copy.length), 0, '')
      return copy
    })
    const nextDelimiter = [...delimiter]
    nextDelimiter.splice(Math.min(at, nextDelimiter.length), 0, '---')
    return rebuild(nextRows, nextDelimiter)
  }

  if (op === 'delete-column') {
    if (cols <= 1) return null
    const at = Math.min(colIndex, cols - 1)
    const nextRows = rows.map((r) => r.filter((_, i) => i !== at))
    const nextDelimiter = delimiter.filter((_, i) => i !== at)
    return rebuild(nextRows, nextDelimiter)
  }

  if (op === 'insert-row-below') {
    const nextRows = rows.map((r) => [...r])
    const at = rowIndex === 0 ? Math.min(1, nextRows.length) : Math.min(rowIndex + 1, nextRows.length)
    nextRows.splice(at, 0, Array.from({ length: cols }, () => ''))
    return rebuild(nextRows, delimiter)
  }

  if (op === 'delete-row') {
    if (rows.length <= 1) return null
    const at = Math.min(rowIndex, rows.length - 1)
    const nextRows = rows.filter((_, i) => i !== at)
    return rebuild(nextRows, delimiter)
  }

  if (op === 'toggle-header-row') {
    if (rows.length < 2) return null
    const nextRows = rows.map((r) => [...r])
    ;[nextRows[0], nextRows[1]] = [nextRows[1], nextRows[0]]
    return rebuild(nextRows, delimiter)
  }

  return null
}
