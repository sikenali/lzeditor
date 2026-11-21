import React, { useMemo, useEffect, useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'

/**
 * WYSIWYG（Milkdown）编辑器的行号栏（优化 #28）。
 *
 * Milkdown 是 ProseMirror 所见即所得，没有原生行号；这里按 markdown 源码行数
 * 渲染一条左侧行号栏。行号栏作为编辑器壳的绝对定位兄弟元素，不触碰 Milkdown
 * 的 DOM；滚动与 .milkdown 滚动容器同步，数字随滚动上移。开启「显示行号」才渲染。
 *
 * 定位策略（修复重影/漂移）：
 *  - 优先用「真实块位置」：把 markdown 拆成块区间（标题/段落/代码/列表…），
 *    与 .ProseMirror 渲染出来的顶层块一一配对（数量一致才成立），每块按源码行数
 *    均分其真实高度——数字贴住内容行，不再按字符偏移占比漂移/重叠。
 *  - 配对失败（块数不一致，如嵌套列表/表格特殊结构）退回字符偏移占比近似，
 *    保证不崩、仍有行号。
 */
export const MilkdownLineGutter: React.FC<{
  md: string
  getScroller: () => HTMLElement | null
}> = ({ md, getScroller }) => {
  const showLineNumbers = useSettingsStore((s) => s.showLineNumbers)
  const [contentH, setContentH] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)
  // 每个源码行的「内容相对顶部」像素位置（0 = 滚动内容顶）。null = 未量到/配对失败。
  const [lineTops, setLineTops] = useState<number[] | null>(null)

  // 每个源码行的起始字符偏移（近似定位兜底用）
  const lines = useMemo(() => {
    const arr = md.split('\n')
    let acc = 0
    return arr.map((text, i) => {
      const start = acc
      acc += text.length + 1
      return { n: i + 1, start, len: text.length }
    })
  }, [md])
  const total = useMemo(() => lines.reduce((a, l) => a + l.len + 1, 0) || 1, [lines])

  useEffect(() => {
    if (!showLineNumbers) return
    const scroller = getScroller()
    if (!scroller) return
    const pm = scroller.querySelector<HTMLElement>('.ProseMirror')
    if (!pm) return

    const onScroll = () => setScrollTop(scroller.scrollTop)
    // 量真实块位置：markdown 块区间与 DOM 顶层块一一配对才成立
    const measure = () => {
      setContentH(scroller.scrollHeight)
      setScrollTop(scroller.scrollTop)
      setLineTops(measureLineTops(pm, scroller, md))
    }
    measure()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(pm)
    const mo = new MutationObserver(measure)
    mo.observe(pm, { childList: true, subtree: true, characterData: true })
    return () => {
      scroller.removeEventListener('scroll', onScroll)
      ro.disconnect()
      mo.disconnect()
    }
  }, [showLineNumbers, getScroller, md])

  if (!showLineNumbers) return null
  const usableH = Math.max(contentH - 48, 1) // 扣除 .ProseMirror 上下的 24px padding
  const hasReal = lineTops !== null
  return (
    <div className="milkdown-line-gutter" aria-hidden="true">
      {lines.map((l) => {
        let top: number
        if (hasReal && lineTops[l.n - 1] !== undefined) top = lineTops[l.n - 1] - scrollTop
        else top = (l.start / total) * usableH + 24 - scrollTop
        if (top < -8 || top > window.innerHeight + 8) return null
        return (
          <span key={l.n} className="milkdown-line-num" style={{ top }}>
            {l.n}
          </span>
        )
      })}
    </div>
  )
}

/** markdown 块区间（1-based 源码行，含空行间隔由调用方插值）。 */
interface BlockRange {
  start: number
  end: number
}

const isListLine = (s: string) => /^\s*(?:[-+*]|\d+[.)])\s+/.test(s)

/** 把 markdown 拆成「块区间」列表（每个块 = 若干连续源码行）。
    空行不产块；代码围栏、标题、引用、表格、列表、段落各自聚合。 */
function blocksFromMarkdown(md: string): BlockRange[] {
  const lines = md.split('\n')
  const n = lines.length
  const blocks: BlockRange[] = []
  let i = 0
  while (i < n) {
    const line = lines[i].trim()
    if (!line) {
      i++
      continue
    }
    const start = i + 1
    if (/^(```|~~~)/.test(line)) {
      const fence = line.slice(0, 3)
      let j = i + 1
      while (j < n && !lines[j].trim().startsWith(fence)) j++
      const end = Math.min(j + 1, n)
      blocks.push({ start, end })
      i = end
      continue
    }
    if (/^#{1,6}\s+/.test(line)) {
      blocks.push({ start, end: start })
      i++
      continue
    }
    if (/^>/.test(line)) {
      let j = i + 1
      while (j < n && /^>/.test(lines[j])) j++
      blocks.push({ start, end: j })
      i = j
      continue
    }
    if (/^\|/.test(line)) {
      let j = i + 1
      while (j < n && /^\|/.test(lines[j])) j++
      blocks.push({ start, end: j })
      i = j
      continue
    }
    if (/^\s*([-*_])\s*(?:\1\s*){2,}$/.test(line)) {
      blocks.push({ start, end: start })
      i++
      continue
    }
    if (isListLine(line)) {
      let last = i
      let k = i
      while (k < n) {
        const l = lines[k]
        if (!l.trim()) {
          // 空行：仅当下一行仍是列表项才延续（列表内空行），否则列表结束
          if (k + 1 < n && isListLine(lines[k + 1])) {
            k++
            last = k
            continue
          }
          break
        }
        if (isListLine(l) || /^\s+/.test(l)) {
          last = k
          k++
          continue
        }
        break
      }
      blocks.push({ start, end: last + 1 })
      i = last + 1
      continue
    }
    let j = i + 1
    while (j < n && lines[j].trim()) j++
    blocks.push({ start, end: j })
    i = j
  }
  return blocks
}

/**
 * 量每个源码行的内容相对顶部（0 = 滚动内容顶）。
 * 仅当 markdown 块区间数与 .ProseMirror 顶层块数一致才返回精确结果，否则 null
 * （调用方退回字符偏移占比近似，避免错位反而更糟）。
 */
function measureLineTops(pm: HTMLElement, scroller: HTMLElement, md: string): number[] | null {
  const blocks = blocksFromMarkdown(md)
  const domBlocks = Array.from(pm.children).filter((el) => {
    const t = el.tagName.toLowerCase()
    return t !== 'script' && t !== 'style' && t !== 'link'
  })
  if (blocks.length !== domBlocks.length) return null
  const totalLines = md.split('\n').length
  const tops: number[] = new Array(totalLines).fill(undefined as unknown as number)
  const scrollerTop = scroller.getBoundingClientRect().top
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const rect = domBlocks[i].getBoundingClientRect()
    if (!Number.isFinite(rect.top) || rect.height <= 0) continue
    const blockTop = rect.top - scrollerTop + scroller.scrollTop
    const lineCount = b.end - b.start + 1
    for (let l = 0; l < lineCount; l++) {
      tops[b.start - 1 + l] = lineCount === 1 ? blockTop : blockTop + (l / lineCount) * rect.height
    }
  }
  // 空行（不产块）用最近前后已知行线性插值，保证每个源码行都有数字
  let prev = -1
  for (let i = 0; i < totalLines; i++) {
    if (tops[i] !== undefined) {
      prev = i
      continue
    }
    let next = -1
    for (let j = i + 1; j < totalLines; j++) {
      if (tops[j] !== undefined) {
        next = j
        break
      }
    }
    if (prev >= 0 && next >= 0) tops[i] = tops[prev] + ((i - prev) / (next - prev)) * (tops[next] - tops[prev])
    else if (prev >= 0) tops[i] = tops[prev]
    else if (next >= 0) tops[i] = tops[next]
    else tops[i] = 0
  }
  return tops
}
