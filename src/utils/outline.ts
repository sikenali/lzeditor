/** 大纲侧栏的纯逻辑：当前节、深度过滤、计数标签。不依赖 React，方便单测。 */

/** 0 = 全部层级；1/2/3 = 显示到该层级为止。 */
export type OutlineDepth = 0 | 1 | 2 | 3

export const OUTLINE_DEPTHS: readonly OutlineDepth[] = [0, 1, 2, 3]

/** 光标正好落在某标题首行也算「在这一节」，留一点亚行容差。 */
const LINE_TOLERANCE = 0.05

export interface OutlineHeading {
  /** 标题所在行号（与 cursorPosition.line 同一基准） */
  line: number
  level: number
}

/**
 * 光标所在行属于哪一节：最后一个不晚于它的标题。
 * 第一条标题之前返回 -1。
 */
export function currentSectionIndex(headings: readonly OutlineHeading[], line: number): number {
  let low = 0
  let high = headings.length - 1
  let found = -1
  const limit = line + LINE_TOLERANCE
  while (low <= high) {
    const middle = (low + high) >> 1
    if ((headings[middle] as OutlineHeading).line <= limit) {
      found = middle
      low = middle + 1
    } else {
      high = middle - 1
    }
  }
  return found
}

/** 一条显示的标题，加上它在完整列表里的下标。 */
export interface OutlineEntry<H extends OutlineHeading = OutlineHeading> {
  heading: H
  index: number
}

/** 深度过滤后剩下的标题，各自带上在完整列表里的下标。 */
export function filterByDepth<H extends OutlineHeading = OutlineHeading>(
  headings: readonly H[],
  depth: OutlineDepth,
): OutlineEntry<H>[] {
  const entries: OutlineEntry<H>[] = []
  for (let index = 0; index < headings.length; index++) {
    const heading = headings[index] as H
    if (depth === 0 || heading.level <= depth) entries.push({ heading, index })
  }
  return entries
}

/**
 * 过滤隐藏了部分标题时，当前节对应的可见位置：
 * 当前标题本身，或它上面最近的可见标题。还没有可见标题时返回 null。
 */
export function shownCurrent(entries: readonly OutlineEntry[], current: number): number | null {
  let found: number | null = null
  for (let i = 0; i < entries.length; i++) {
    if ((entries[i] as OutlineEntry).index <= current) found = i
    else break
  }
  return found
}

/** 「7 节」；过滤隐藏了部分时是「3 / 7 节」。 */
export function sectionCountLabel(shown: number, total: number): string {
  return shown === total ? `${total} 节` : `${shown} / ${total} 节`
}

export function depthLabel(depth: OutlineDepth): string {
  return depth === 0 ? '全部' : `${depth}`
}

/**
 * Roving 焦点的下一停点，大纲列表和层级单选组共用 —— 与 backtickle 的 rovingIndex 一致。
 * 回绕，上下左右四个方向都移动，Home/End 跳首尾；不是这些键返回 null。
 */
export function rovingIndex(key: string, index: number, count: number): number | null {
  if (count === 0) return null
  if (key === 'ArrowRight' || key === 'ArrowDown') return (index + 1) % count
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (index - 1 + count) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}
