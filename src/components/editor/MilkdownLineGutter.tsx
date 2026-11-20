import React, { useMemo, useEffect, useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'

/**
 * WYSIWYG（Milkdown）编辑器的行号栏（优化 #28）。
 *
 * Milkdown 是 ProseMirror 所见即所得，没有原生行号；这里按 markdown 源码行数
 * 渲染一条左侧行号栏，每个数字按它在源码中的字符偏移占比定位（近似源码行号）。
 * 行号栏作为编辑器壳的绝对定位兄弟元素，不触碰 Milkdown 的 DOM；滚动与
 * .milkdown 滚动容器同步，数字随滚动上移。开启「显示行号」才渲染。
 */
export const MilkdownLineGutter: React.FC<{
  md: string
  getScroller: () => HTMLElement | null
}> = ({ md, getScroller }) => {
  const showLineNumbers = useSettingsStore((s) => s.showLineNumbers)
  const [contentH, setContentH] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  // 每个源码行的起始字符偏移（近似定位用）
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
    const measure = () => {
      setContentH(scroller.scrollHeight)
      setScrollTop(scroller.scrollTop)
    }
    measure()
    scroller.addEventListener('scroll', measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(scroller)
    return () => {
      scroller.removeEventListener('scroll', measure)
      ro.disconnect()
    }
  }, [showLineNumbers, getScroller, md])

  if (!showLineNumbers) return null
  const usableH = Math.max(contentH - 48, 1) // 扣除 .ProseMirror 上下的 24px padding
  return (
    <div className="milkdown-line-gutter" aria-hidden="true">
      {lines.map((l) => {
        const top = (l.start / total) * usableH + 24 - scrollTop
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
