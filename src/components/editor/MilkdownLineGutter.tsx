import React, { useEffect, useMemo, useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'

/**
 * WYSIWYG（Milkdown）编辑器的行号栏（优化 #28 / #3 / #4）。
 *
 * 行号按「源码行 × 统一行高」等距绘制：每行都有独立的编号位置，不随右侧
 * 内容的真实高度（标题/图片/表格）跳动，也不会因为空行或块数对不上而叠在
 * 一起。这正是通用 Markdown 源码编辑器的行为，也是用户要求的「每行都显示
 * 对应的行号数字，而不是根据右侧文字内容显示」。
 *
 * 性能：只渲染视口附近的编号（窗口化），500KB 文档也不会生成上万节点。
 * 行号栏是编辑器壳的绝对定位兄弟元素，不触碰 Milkdown 的 DOM。
 */
export const MilkdownLineGutter: React.FC<{
  md: string
  getScroller: () => HTMLElement | null
}> = ({ md, getScroller }) => {
  const showLineNumbers = useSettingsStore((s) => s.showLineNumbers)
  const defaultFontSize = useSettingsStore((s) => s.defaultFontSize)
  const lineHeightSetting = useSettingsStore((s) => s.lineHeight)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewH, setViewH] = useState(0)
  /** 统一行高（px）；0 = 还没量到，先不渲染，避免编号全堆在顶部。 */
  const [step, setStep] = useState(0)

  const total = useMemo(() => {
    const n = md.split('\n').length
    return Math.max(1, n)
  }, [md])

  useEffect(() => {
    if (!showLineNumbers) return
    let disposed = false
    let retry: ReturnType<typeof setTimeout> | null = null
    let cleanup: (() => void) | null = null
    let tries = 0

    const attach = () => {
      if (disposed) return
      const scroller = getScroller()
      const pm = scroller?.querySelector<HTMLElement>('.ProseMirror') ?? null
      if (!scroller || !pm) {
        if (++tries < 100) retry = setTimeout(attach, 100)
        return
      }
      const measure = () => {
        if (disposed) return
        // 行高取编辑器正文段落的实际计算值（跟随字号/行距设置与主题），
        // 取不到时回落到设置值，保证编号仍然等距、稳定。
        let lh = NaN
        const sample = pm.querySelector<HTMLElement>('p')
        if (sample) lh = parseFloat(getComputedStyle(sample).lineHeight)
        if (!Number.isFinite(lh) || lh <= 0) {
          lh = (Number(lineHeightSetting) || 1.8) * (Number(defaultFontSize) || 16)
        }
        setStep(lh > 0 ? lh : 24)
        setScrollTop(scroller.scrollTop)
        setViewH(scroller.clientHeight)
      }
      const onScroll = () => {
        setScrollTop(scroller.scrollTop)
        setViewH(scroller.clientHeight)
      }
      measure()
      scroller.addEventListener('scroll', onScroll, { passive: true })
      const ro = new ResizeObserver(measure)
      ro.observe(scroller)
      ro.observe(pm)
      let cancelled = false
      try {
        document.fonts?.ready.then(() => { if (!cancelled) measure() }).catch(() => {})
      } catch { /* 字体接口不可用时忽略 */ }
      cleanup = () => {
        cancelled = true
        scroller.removeEventListener('scroll', onScroll)
        ro.disconnect()
      }
    }
    attach()
    return () => {
      disposed = true
      if (retry) clearTimeout(retry)
      cleanup?.()
    }
  }, [showLineNumbers, getScroller, md, defaultFontSize, lineHeightSetting])

  if (!showLineNumbers) return null
  if (step <= 0 || viewH <= 0) return null

  const pad = 24
  // 只渲染视口上下各留一行的编号，滚动时窗口跟着移动。
  const first = Math.max(1, Math.floor((scrollTop - pad) / step) - 1)
  const last = Math.min(total, Math.ceil((scrollTop + viewH - pad) / step) + 1)
  const nums: number[] = []
  for (let n = first; n <= last; n++) nums.push(n)

  return (
    <div className="milkdown-line-gutter" aria-hidden="true">
      {nums.map((n) => (
        <span
          key={n}
          className="milkdown-line-num"
          style={{ top: pad + (n - 1) * step - scrollTop }}
        >
          {n}
        </span>
      ))}
    </div>
  )
}
