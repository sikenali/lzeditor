import type { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

/**
 * markdown 表格的行/列编辑。
 *
 * 表格就是一段连续的 `| ... |` 行，所以所有操作都按「找出整块 → 重算文本 → 一次 dispatch」
 * 来做，不用去逐个单元格改偏移。
 *
 * markdown 无法表达单元格合并（需要 HTML colspan），所以不提供 merge/split。
 */

export type TableOp = 'row' | 'delRow' | 'col' | 'colBefore' | 'delCol' | 'headerRow' | 'delete'

const TABLE_LINE = /^\s*\|.*\|\s*$/
const SEP_CELL = /^:?-{3,}:?$/

interface Block {
  from: number
  to: number
  lines: string[]
  rowIdx: number
  colIdx: number
  indent: string
}

function splitCells(line: string): string[] {
  const s = line.trim()
  if (s.length < 2 || s.charAt(0) !== '|' || s.charAt(s.length - 1) !== '|') return []
  return s.slice(1, -1).split('|').map(c => c.trim())
}

const isSepRow = (cells: string[]) => {
  // 插列后分隔行会变成 `| --- |  | --- |`，空单元格不能让它不再被认成分隔行
  const nonEmpty = cells.filter(c => c !== '')
  return nonEmpty.length > 0 && nonEmpty.every(c => SEP_CELL.test(c))
}

function findBlock(view: EditorView): Block | null {
  const { state } = view
  const doc = state.doc
  const cur = doc.lineAt(state.selection.main.from)
  if (!TABLE_LINE.test(cur.text)) return null

  let start = cur.number
  while (start > 1 && TABLE_LINE.test(doc.line(start - 1).text)) start--
  let end = cur.number
  while (end < doc.lines && TABLE_LINE.test(doc.line(end + 1).text)) end++
  if (end - start < 1) return null

  const lines: string[] = []
  for (let n = start; n <= end; n++) lines.push(doc.line(n).text)

  // 列号 = 光标前面第几个 | 减一
  const from = state.selection.main.from
  const rel = Math.max(0, from - doc.line(cur.number).from)
  let colIdx = (cur.text.slice(0, rel).match(/\|/g) || []).length - 1
  if (colIdx < 0) colIdx = 0
  const width = Math.max(1, ...lines.map(l => splitCells(l).length))
  colIdx = Math.min(colIdx, width - 1)

  return {
    from: doc.line(start).from,
    to: doc.line(end).to,
    lines,
    rowIdx: cur.number - start,
    colIdx,
    indent: (/^\s*/.exec(lines[0]) as RegExpExecArray)[0],
  }
}

/** 在拼接好的行数组里，定位到 (row, col) 单元格内容的起始偏移。 */
function anchorIn(lines: string[], rowIdx: number, colIdx: number): number {
  let off = 0
  for (let i = 0; i < rowIdx; i++) off += lines[i].length + 1
  const line = lines[Math.min(Math.max(rowIdx, 0), lines.length - 1)] || ''
  let p = 0
  for (let c = 0; c < colIdx; c++) {
    const i = line.indexOf('|', p)
    if (i < 0) break
    p = i + 1
  }
  while (p < line.length && line.charAt(p) === ' ') p++
  return off + p
}

function buildRow(indent: string, cells: string[]): string {
  // markdown-it 要求分隔行每一格都是 `---` 形态，缺格的表格会整块渲染不出来
  const sep = isSepRow(cells)
  return `${indent}| ${cells.map(c => {
    const t = (c || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')
    return sep ? (SEP_CELL.test(t) ? t : '---') : t
  }).join(' | ')} |`
}

export function runTableOp(view: EditorView, op: TableOp): boolean {
  const blk = findBlock(view)
  if (!blk) return false

  if (op === 'delete') {
    view.dispatch({
      changes: { from: blk.from, to: blk.to, insert: '' },
      userEvent: 'input.delete',
    })
    return true
  }

  const rows: string[][] = blk.lines.map(splitCells)
  if (!rows.length) return false
  const width = Math.max(1, ...rows.map(r => r.length))
  const empty = (w: number) => Array.from({ length: w }, () => '')
  let next: string[][] = rows
  let r = blk.rowIdx
  let c = blk.colIdx

  switch (op) {
    case 'row': {
      // 光标在标题行时插到分隔行下面，避免出现「两行分隔」的坏表格
      let at = r + 1
      if (at <= 1 && rows[1] && isSepRow(rows[1])) at = 2
      next = [...rows.slice(0, at), empty(width), ...rows.slice(at)]
      r = at
      break
    }
    case 'delRow':
      next = rows.filter((_, i) => i !== r)
      r = Math.min(r, next.length - 1)
      break
    case 'col':
      next = rows.map(row => [...row.slice(0, c + 1), '', ...row.slice(c + 1)])
      c += 1
      break
    case 'colBefore':
      next = rows.map(row => [...row.slice(0, c), '', ...row.slice(c)])
      break
    case 'delCol':
      if (width <= 1) return false
      next = rows.map(row => row.filter((_, i) => i !== c))
      c = Math.min(c, width - 2)
      break
    case 'headerRow': {
      // 有分隔行就删掉（退化成纯竖线文本），没有就补在第二行
      if (next[1] && isSepRow(next[1])) next = [next[0], ...next.slice(2)]
      else if (next.length >= 2) next = [next[0], empty(width), ...next.slice(1)]
      break
    }
  }

  const lines = next.map(row => buildRow(blk.indent, row.length ? row : empty(width)))
  view.dispatch({
    changes: { from: blk.from, to: blk.to, insert: lines.join('\n') },
    selection: EditorSelection.single(anchorIn(lines, r, c)),
    userEvent: 'input.edit',
  })
  return true
}

/** 光标是否在表格内（表格子菜单的置灰依赖它）。 */
export function isCursorInTable(view: EditorView): boolean {
  const { state } = view
  return TABLE_LINE.test(state.doc.lineAt(state.selection.main.from).text)
}
