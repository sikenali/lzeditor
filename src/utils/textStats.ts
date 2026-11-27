/**
 * 正文统计：字数 / 字符数 / 行列（状态栏真实数据，task 9）。
 *
 * 这些从「源码 markdown」近似统计：CJK 字符逐字计数、拉丁/数字按连续词计数
 * （markdown 语法符号不计入字数）。字符数取非空白字符。
 */

/** 近似字数：CJK 逐字 + 拉丁/数字连续词。 */
export function countWords(text: string): number {
  const m = text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]|[A-Za-z0-9_]+/g)
  return m ? m.length : 0
}

/** 非空白字符数。 */
export function countChars(text: string): number {
  return text.replace(/\s/g, '').length
}

/** 源码偏移 → 1-based { line, column }。 */
export function lineColFromSource(source: string, offset: number): { line: number; column: number } {
  const o = Math.max(0, Math.min(offset, source.length))
  const before = source.slice(0, o)
  const line = before.split('\n').length
  const lastNl = before.lastIndexOf('\n')
  const column = o - lastNl
  return { line, column }
}

/** 1-based 行号 → 该行首字符的源码偏移（越界行夹到首/末行）。 */
export function lineStartOffset(source: string, line: number): number {
  const lines = source.split('\n')
  const l = Math.max(1, Math.min(Math.floor(line) || 1, lines.length))
  let offset = 0
  for (let i = 0; i < l - 1; i++) offset += lines[i].length + 1
  return offset
}

/**
 * 1-based 行号 → 该行正文（去掉块级标记后）的源码偏移。
 * 编辑/代码模式互切时用它把光标落到正文，而不是停在 `# `/`- ` 标记前。
 */
export function lineContentOffset(source: string, line: number): number {
  const start = lineStartOffset(source, line)
  const rest = source.slice(start)
  const marker = /^(?:#{1,6}\s+|>\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+|`{3,}[^\n]*\n)/.exec(rest)
  return start + (marker ? marker[0].length : 0)
}
