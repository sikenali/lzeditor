/**
 * Builds a GFM markdown table from a row/col grid.
 *
 * GFM requires a `|---|---|` delimiter row on the second line for the block to
 * be recognised as a table — without it the whole block renders as plain
 * vertical-bar text. So even the "no header" variant emits the delimiter row
 * (GFM then styles the first row as the header; there is no header-less GFM
 * table, but at least it renders as a real table).
 */
export function buildTableMd(rows: number, cols: number, data?: string[][], withHeader = true): string {
  const r = Math.max(1, Math.min(rows, 50))
  const c = Math.max(1, Math.min(cols, 30))
  const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim()
  const pad = (i: number, j: number, fallback = '') => cell(data?.[i]?.[j] ?? fallback)
  const body = (i: number) => `| ${Array.from({ length: c }, (_, j) => pad(i, j)).join(' | ')} |`
  const separator = `| ${Array.from({ length: c }, () => '---').join(' | ')} |`

  if (!withHeader) {
    // 无标题：仍写分隔行（否则整块退化成纯竖线文本），首行充当表头。
    return [
      body(0),
      separator,
      ...Array.from({ length: r - 1 }, (_, i) => body(i + 1)),
    ].join('\n')
  }

  return [
    `| ${Array.from({ length: c }, (_, i) => pad(0, i, `表头${i + 1}`)).join(' | ')} |`,
    separator,
    ...Array.from({ length: r - 1 }, (_, i) => body(i + 1)),
  ].join('\n')
}
