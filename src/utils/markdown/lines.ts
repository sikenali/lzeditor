import type { MarkdownIt, Token } from 'markdown-it'

/**
 * 预览块的源码行标注 + 滚动映射表。
 *
 * 同步滚动不能按「滚动了百分之多少」换算：编辑器里两行对应预览里两百像素，
 * 比例法一偏就是一整块。这里给每个顶层块写上 data-line / data-end-line，
 * 滚动时量块的真实像素位置，相邻锚点之间线性插值，行号与像素一一对应。
 * 坐标一律从容器顶边起算，跟容器当前滚到哪儿无关。
 */

export const DATA_LINE = 'data-line'
export const DATA_END_LINE = 'data-end-line'

/**
 * 给顶层块写上源码行号（0-based）。嵌套块不标：
 * 预览只按顶层块的第一个孩子排布，内层标了没人读。
 */
export function annotateBlockLines(tokens: Token[]): void {
  for (const token of tokens) {
    if (token.nesting !== 1 || token.level !== 0 || !token.map) continue
    const map = token.map
    if (map.length < 2 || map[1] <= map[0]) continue
    token.attrSet(DATA_LINE, map[0])
    token.attrSet(DATA_END_LINE, map[1] - 1)
  }
}

/**
 * 挂成 core rule，按 env.blockLines 开关。
 * 走 core rule 而不是渲染后改字符串：token 上的属性由渲染器自己写进标签，
 * 不会被后处理正则误伤。
 */
export function registerBlockLinesRule(md: MarkdownIt): void {
  // 必须在 block 分词之后跑：之前 state.tokens 还是空的
  md.core.ruler.after('block', 'block-lines', (state) => {
    if (state.env.blockLines !== true) return
    annotateBlockLines(state.tokens)
  })
}

export interface ScrollMap {
  /** 某个（可以带小数）0-based 源码行在文章里的偏移。 */
  offsetForLine(line: number): number
  /** 某个偏移处的（可以带小数）0-based 源码行。 */
  lineForOffset(offset: number): number
  /** 表里的块数。0 表示预览还没布局好。 */
  readonly blocks: number
}

/**
 * 从预览容器建一张源码行 ↔ 像素偏移的映射表。
 * 容器里带 data-line 的直接孩子才算锚点，每个块给两个锚点：
 * 首行落在顶边、末行之后落在底边。
 *
 * 两个方向都必须单调。脚注这类跳到文末的块，它的行号比前面小，
 * 直接存会让二分查找算出负的行号；一律夹到前面最大的行，
 * 滚过脚注时编辑器停在正文末尾。
 */
export function buildScrollMap(container: HTMLElement): ScrollMap {
  const lines: number[] = []
  const offsets: number[] = []
  const origin = container.getBoundingClientRect().top
  let blocks = 0

  const add = (line: number, offset: number): void => {
    const lastLine = lines[lines.length - 1]
    const lastOffset = offsets[offsets.length - 1]
    lines.push(lastLine === undefined ? line : Math.max(lastLine, line))
    offsets.push(lastOffset === undefined ? offset : Math.max(lastOffset, offset))
  }

  for (const element of container.children) {
    if (!element.hasAttribute(DATA_LINE)) continue
    const line = Number(element.getAttribute(DATA_LINE))
    const end = Number(element.getAttribute(DATA_END_LINE))
    if (!Number.isFinite(line)) continue
    const rect = element.getBoundingClientRect()
    add(line, rect.top - origin)
    add(Number.isFinite(end) ? Math.max(end, line) + 1 : line + 1, rect.bottom - origin)
    blocks++
  }

  return {
    blocks,

    offsetForLine(line: number): number {
      const count = lines.length
      if (count === 0) return 0
      const first = lines[0] as number
      const last = lines[count - 1] as number
      if (line <= first) return offsets[0] as number
      if (line >= last) return offsets[count - 1] as number
      // 行号不小于 line 的第一个锚点
      let low = 0
      let high = count - 1
      while (low < high) {
        const middle = (low + high) >> 1
        if ((lines[middle] as number) >= line) high = middle
        else low = middle + 1
      }
      const upperLine = lines[low] as number
      const upperOffset = offsets[low] as number
      if (upperLine === line || low === 0) return upperOffset
      const lowerLine = lines[low - 1] as number
      const lowerOffset = offsets[low - 1] as number
      const fraction = (line - lowerLine) / (upperLine - lowerLine)
      return lowerOffset + fraction * (upperOffset - lowerOffset)
    },

    lineForOffset(offset: number): number {
      const count = lines.length
      if (count === 0) return 0
      if (offset <= (offsets[0] as number)) return lines[0] as number
      if (offset >= (offsets[count - 1] as number)) return lines[count - 1] as number
      // 偏移不大于 offset 的最后一个锚点
      let low = 0
      let high = count - 1
      while (low < high) {
        const middle = (low + high + 1) >> 1
        if ((offsets[middle] as number) <= offset) low = middle
        else high = middle - 1
      }
      const lowerOffset = offsets[low] as number
      const upperOffset = offsets[low + 1] as number
      const lowerLine = lines[low] as number
      const upperLine = lines[low + 1] as number
      if (upperOffset === lowerOffset) return lowerLine
      const fraction = (offset - lowerOffset) / (upperOffset - lowerOffset)
      return lowerLine + fraction * (upperLine - lowerLine)
    },
  }
}

/** 链接、按钮、复选框、输入框、summary 这些点下去有自己要做的事，别劫持 */
export const OWN_ACTION =
  'a, button, input, textarea, select, summary, label, [role="tab"], [role="button"], [contenteditable="true"]'

function selectionEndsHere(article: HTMLElement): boolean {
  const selection = article.ownerDocument.getSelection()
  if (!selection || selection.isCollapsed) return false
  return (
    (selection.anchorNode !== null && article.contains(selection.anchorNode)) ||
    (selection.focusNode !== null && article.contains(selection.focusNode))
  )
}

/**
 * 预览里点一下对应哪一行源码，0-based；不是「跳到源码」的点击返回 null。
 * 非主键、带修饰键、双击三击、拖选结束、点在链接按钮复选框上，都算别的意图。
 * 只读 DOM，移动编辑器的动作由调用方做。
 */
export function sourceLineOfClick(event: MouseEvent, article: HTMLElement): number | null {
  if (event.button !== 0 || event.detail > 1 || event.defaultPrevented) return null
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return null
  const target = event.target
  if (!(target instanceof Element) || !article.contains(target)) return null
  if (target.closest(OWN_ACTION)) return null
  if (selectionEndsHere(article)) return null
  for (let el: Element | null = target; el && el !== article; el = el.parentElement) {
    const value = el.getAttribute(DATA_LINE)
    if (value === null) continue
    const line = Number(value)
    return Number.isInteger(line) && line >= 0 ? line : null
  }
  return null
}
