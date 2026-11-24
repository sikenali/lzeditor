import { isHeading, type BlockKind } from './blockKind'

/**
 * 双联页阅读模式的分页引擎。
 *
 * 只吃数字与枚举，不碰 DOM 与 React，方便单测。
 * 装箱是保序的首次适配：块按原文顺序进页，不放就换页，不重排。
 *
 * `h` 是**槽位高**——块自身的 offsetHeight 加它占用的外边距，
 * 也就是下一块的 top 减去本块的 top。只传 offsetHeight 会把块间距漏掉，
 * 实际渲染比页高多出几十像素，最后一页就会溢出。
 */
export interface PageBlock {
  /** 槽位高（含外边距） */
  h: number
  kind: BlockKind
  /** 0-based 起始源码行，取自块的 data-line */
  line: number
  /** 稳定键，翻页时复用节点 */
  key: string
}

export interface Page<T extends PageBlock = PageBlock> {
  blocks: T[]
  height: number
  /** 本页内容超过页高，页内需要自己滚 */
  over: boolean
}

/** 高度非正（隐藏元素、测量失败）按 1px 计，避免不可见页与除零 */
const sizeOf = (b: PageBlock): number => (b.h > 0 ? b.h : 1)

/**
 * 把块装箱成页。
 *
 * 规则：整块不可切；标题不做页尾孤行；单块超过页高时独占一页并标 `over`。
 */
export function paginate<T extends PageBlock>(blocks: T[], pageHeight: number): Page<T>[] {
  if (!blocks.length || !(pageHeight > 0)) return []

  const pages: Page<T>[] = []
  let cur: T[] = []
  let acc = 0

  const pushPage = (): void => {
    if (!cur.length) return
    pages.push({ blocks: cur, height: acc, over: acc > pageHeight })
    cur = []
    acc = 0
  }

  for (const block of blocks) {
    const h = sizeOf(block)

    if (h > pageHeight) {
      pushPage()
      pages.push({ blocks: [block], height: h, over: true })
      continue
    }

    if (acc + h <= pageHeight) {
      cur.push(block)
      acc += h
      continue
    }

    // 放不下：当前页收尾。标题留在页尾、内容全在下一页要连标题一起搬到下一页；
    // 合起来还是放不下的话只能接受孤行，那比一页只有一个标题强。
    // 若紧跟的也是一级标题（常见是 H2 后接 H3），就不搬——搬走会让上一页只剩
    // 一个孤标题占满整页，浪费一整页版面。
    const last = cur[cur.length - 1]
    let carried: T | null = null
    if (last && isHeading(last.kind) && !isHeading(block.kind)
      && sizeOf(last) + h <= pageHeight) {
      carried = cur.pop() as T
      acc -= sizeOf(carried)
    }
    pushPage()
    if (carried) {
      cur.push(carried)
      acc = sizeOf(carried)
    }
    cur.push(block)
    acc += h
  }

  pushPage()
  return pages
}

/**
 * 行号落在第几页。块起始行在页与页之间严格递增，
 * 所以取「首块行号不大于 line 的最后一页」即命中。
 * 命中不了（行号早于首块，或文档已变更）返回 null，由调用方决定退化行为。
 */
export function pageOfLine<T extends PageBlock>(pages: Page<T>[], line: number): number | null {
  if (!pages.length) return null
  let lo = 0
  let hi = pages.length - 1
  let found: number | null = null
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const page = pages[mid] as Page
    const first = page.blocks[0]?.line ?? 0
    if (first <= line) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return found
}

/** 页对数：页数除以 2 向上取整，最后一页可以只有左页 */
export function spreadCount(pageCount: number): number {
  return Math.ceil(pageCount / 2)
}
