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
