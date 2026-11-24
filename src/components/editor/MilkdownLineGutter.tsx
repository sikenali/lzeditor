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
  const total = useMemo(() => lines.length || 1, [lines])

  useEffect(() => {
    if (!showLineNumbers) return
    let disposed = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let cleanup: (() => void) | null = null
    let tries = 0

    // Milkdown 的 .milkdown/.ProseMirror 是异步挂载的：首帧 getScroller() 往往还是
    // null，直接 return 会让行号在 contentH=0 时全部堆在顶部。这里轮询到编辑器
    // 真正挂载后再测量，并在字体/布局稳定后补测，避免必须开关一次才正常。
    const attach = () => {
      if (disposed) return
      const scroller = getScroller()
      const pm = scroller?.querySelector<HTMLElement>('.ProseMirror') ?? null
      if (!scroller || !pm) {
        if (++tries < 100) retryTimer = setTimeout(attach, 100)
        return
      }

      const onScroll = () => setScrollTop(scroller.scrollTop)
      // 量真实块位置：markdown 块区间与 DOM 顶层块一一配对才成立
      const measure = () => {
        setContentH(scroller.scrollHeight)
        setScrollTop(scroller.scrollTop)
        setLineTops(measureLineTops(pm, scroller, md))
      }
      measure()
      // 首次挂载时字体、图片、布局可能还没稳定，补两次延迟测量。
      const settle1 = setTimeout(measure, 300)
      const settle2 = setTimeout(measure, 900)
      const onResize = () => measure()
      window.addEventListener('resize', onResize)
      scroller.addEventListener('scroll', onScroll, { passive: true })
      const ro = new ResizeObserver(measure)
      ro.observe(pm)
      const mo = new MutationObserver(measure)
      mo.observe(pm, { childList: true, subtree: true, characterData: true })
      let cancelled = false
      try {
        document.fonts?.ready.then(() => { if (!cancelled) measure() }).catch(() => {})
      } catch { /* 字体接口不可用时忽略 */ }

      cleanup = () => {
        cancelled = true
        clearTimeout(settle1)
        clearTimeout(settle2)
        window.removeEventListener('resize', onResize)
        scroller.removeEventListener('scroll', onScroll)
        ro.disconnect()
        mo.disconnect()
      }
    }
    attach()
    return () => {
      disposed = true
      if (retryTimer) clearTimeout(retryTimer)
      cleanup?.()
    }
  }, [showLineNumbers, getScroller, md])

  if (!showLineNumbers) return null
  // 还没量到内容高度时先不渲染，避免所有行号挤在顶部（等挂载后 measure 再出现）。
  if (contentH <= 0) return null
  const usableH = Math.max(contentH - 48, 1) // 扣除 .ProseMirror 上下的 24px padding
  const hasReal = lineTops !== null
  return (
    <div className="milkdown-line-gutter" aria-hidden="true">
      {lines.map((l) => {
        let top: number
        if (hasReal && Number.isFinite(lineTops[l.n - 1])) top = lineTops[l.n - 1] - scrollTop
        else {
          // 兜底按「行序号」均分内容高度：每个源码行都有独立位置，
          // 不会再因为空行/字符偏移相同而叠在一起、导致某些行号看不见。
          top = ((l.n - 1) / Math.max(1, total - 1)) * usableH + 24 - scrollTop
        }
        if (!Number.isFinite(top)) top = 24
        // 不再按 window.innerHeight 丢弃：行号栏自身 overflow:hidden 会裁掉
        // 视口外的数字，滚动到该行时自然出现，保证每一行都有编号。
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
    if (t === 'script' || t === 'style' || t === 'link') return false
    // Milkdown 会在空行/文末给光标保留空段落（常见形态是 <p><br></p>），源码里
    // 没有对应块。不滤掉会让块数永远对不上，整篇行号退回「按序号均分整页高度」，
    // 新建文档只有几行内容时行号就被拉到整页高度、间距异常巨大。
    if (t === 'p' && !(el.textContent || '').trim()
      && !el.querySelector('img,svg,video,audio,iframe,canvas,hr,table,input')) return false
    return true
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
  // 首/尾没有相邻块的空行按行高外推（不能用最近块的位置，否则多行会叠在一起）。
  // 行高优先取段落计算样式；取不到时再从多行块的实测高度推算。
  let lineStep = 0
  const sample = pm.querySelector<HTMLElement>('p, h1, h2, h3, h4, h5, h6, li')
  const lh = sample ? parseFloat(getComputedStyle(sample).lineHeight) : NaN
  if (Number.isFinite(lh) && lh > 0) lineStep = lh
  if (!lineStep) {
    for (let i = 0; i < blocks.length; i++) {
      const lineCount = blocks[i].end - blocks[i].start + 1
      if (lineCount > 1) {
        const h = domBlocks[i].getBoundingClientRect().height
        if (h > 0) lineStep = Math.max(lineStep, h / lineCount)
      }
    }
  }
  if (!lineStep) lineStep = 24
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
    else if (prev >= 0) tops[i] = tops[prev] + lineStep * (i - prev)
    else if (next >= 0) tops[i] = Math.max(0, tops[next] - lineStep * (next - i))
    else tops[i] = 24
  }
  return tops
}
