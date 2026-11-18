import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { RailMarkerSpec } from '../../utils/railMarkers'

/**
 * 悬浮文档导航条（WeDraft 式 minimap scrollbar）。
 *
 * 不在原生滚动条上做样式：原生滚动条在 Linux/Windows 上占宽度、盖在图片上
 * 会发灰、被图片裁掉。这里在滚动容器右侧浮一条独立窄轨，轨上按内容块画标记，
 * 中间是可拖的视口框——既是滚动条，也是全文导航。轨道本身半透明、带模糊，
 * 压在图片上也能看清，并且不参与布局，不挤占正文宽度。
 *
 * 只接管「滚动」：点击轨道跳转、拖动视口滚动、点击标记跳到对应块。
 * 键盘可聚焦，方向键 / PageUp/PageDown / Home/End 都能滚。
 */

interface ScrollRailProps {
  /** 每次调用都要返回当前活跃的滚动容器（编辑器模式切换后可能换元素）。 */
  getScroller: () => HTMLElement | null
  /** 内容或布局变化后重新计算标记；contentHeight 是滚动容器的 scrollHeight。 */
  getMarkers: (contentHeight: number) => RailMarkerSpec[]
  /** 变化时重新计算标记（源码 / 预览 HTML 版本号）。 */
  version: string | number
  /** 无障碍名称，例如「编辑区导航」。 */
  ariaLabel: string
  /** 额外定位类名，用于区分编辑器 / 预览的边距。 */
  className?: string
}

interface RailMarkerView extends RailMarkerSpec {
  /** 0..1，相对滚动内容总高度 */
  ratio: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

const SCROLL_HINT_MS = 900

export const ScrollRail: React.FC<ScrollRailProps> = ({
  getScroller,
  getMarkers,
  version,
  ariaLabel,
  className,
}) => {
  const railRef = useRef<HTMLDivElement | null>(null)
  const scrollerRef = useRef<HTMLElement | null>(null)
  const markersFnRef = useRef(getMarkers)
  markersFnRef.current = getMarkers
  const scrollerFnRef = useRef(getScroller)
  scrollerFnRef.current = getScroller

  const [scroller, setScroller] = useState<HTMLElement | null>(null)
  const [markers, setMarkers] = useState<RailMarkerView[]>([])
  const [viewport, setViewport] = useState<{ top: number; height: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [active, setActive] = useState(false)
  const dragRef = useRef<{ startY: number; startScroll: number } | null>(null)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 编辑器是异步挂载的（Milkdown / CM6 在 effect 里才建 DOM），
  // 找不到滚动容器就等下一帧，最多等约 2 秒。
  useEffect(() => {
    let raf = 0
    let tries = 0
    let cancelled = false
    const find = () => {
      if (cancelled) return
      const el = scrollerFnRef.current()
      if (el) {
        scrollerRef.current = el
        setScroller(el)
        return
      }
      if (++tries < 120) raf = requestAnimationFrame(find)
    }
    find()
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [])

  const flashActive = useCallback(() => {
    setActive(true)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    hintTimerRef.current = setTimeout(() => setActive(false), SCROLL_HINT_MS)
  }, [])

  const refresh = useCallback(() => {
    const el = scrollerRef.current
    if (!el) return
    const contentHeight = Math.max(1, el.scrollHeight)
    const viewHeight = el.clientHeight
    const maxScroll = contentHeight - viewHeight
    if (maxScroll <= 4 || viewHeight <= 0) {
      setViewport(null)
      setMarkers([])
      return
    }
    const ratio = viewHeight / contentHeight
    const top = clamp(el.scrollTop / contentHeight, 0, 1 - ratio)
    setViewport({ top, height: clamp(ratio, 0.02, 1) })

    const specs = markersFnRef.current(contentHeight)
    const next: RailMarkerView[] = []
    for (const spec of specs) {
      if (!Number.isFinite(spec.top)) continue
      next.push({
        ...spec,
        top: clamp(spec.top, 0, maxScroll),
        ratio: clamp(spec.top / contentHeight, 0, 0.998),
      })
    }
    next.sort((a, b) => a.ratio - b.ratio)
    setMarkers(next)
  }, [])

  // 滚动 / 尺寸 / 内容变化 → 刷新视口与标记。滚动事件 passive，刷新本身很轻。
  useEffect(() => {
    if (!scroller) return
    scroller.classList.add('rail-scroller')

    const onScroll = () => {
      refresh()
      flashActive()
    }
    scroller.addEventListener('scroll', onScroll, { passive: true })

    let raf = 0
    const scheduleRefresh = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(refresh)
    }

    const resize = new ResizeObserver(scheduleRefresh)
    resize.observe(scroller)
    const content = scroller.firstElementChild
    if (content) resize.observe(content)

    // 预览重新渲染 / 图片解码后高度会变，块的位置必须重新量。
    let mutationTimer: ReturnType<typeof setTimeout> | null = null
    const mutations = new MutationObserver(() => {
      if (mutationTimer) clearTimeout(mutationTimer)
      mutationTimer = setTimeout(scheduleRefresh, 160)
    })
    mutations.observe(scroller, { childList: true, subtree: true })

    window.addEventListener('resize', scheduleRefresh)
    scheduleRefresh()

    return () => {
      scroller.classList.remove('rail-scroller')
      scroller.removeEventListener('scroll', onScroll)
      resize.disconnect()
      mutations.disconnect()
      window.removeEventListener('resize', scheduleRefresh)
      cancelAnimationFrame(raf)
      if (mutationTimer) clearTimeout(mutationTimer)
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    }
  }, [scroller, refresh, flashActive])

  // 文档版本变化（输入 / 换文档 / 预览重渲）→ 标记重算。
  useEffect(() => {
    if (!scroller) return
    const raf = requestAnimationFrame(refresh)
    return () => cancelAnimationFrame(raf)
  }, [scroller, version, refresh])

  const scrollToContentOffset = useCallback((target: number) => {
    const el = scrollerRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    el.scrollTop = clamp(target, 0, max)
  }, [])

  const scrollToFraction = useCallback((fraction: number) => {
    const el = scrollerRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    const center = fraction * el.scrollHeight - el.clientHeight / 2
    el.scrollTop = clamp(center, 0, max)
  }, [])

  const beginDrag = (clientY: number) => {
    const el = scrollerRef.current
    if (!el) return
    dragRef.current = { startY: clientY, startScroll: el.scrollTop }
    setDragging(true)
  }

  // 拖动视口框：位移换算成内容像素，轨道高度即内容总高度的缩放。
  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent) => {
      const start = dragRef.current
      const el = scrollerRef.current
      if (!start || !el) return
      const railHeight = railRef.current?.clientHeight || 1
      const max = el.scrollHeight - el.clientHeight
      const delta = ((e.clientY - start.startY) / railHeight) * el.scrollHeight
      el.scrollTop = clamp(start.startScroll + delta, 0, max)
    }
    const onUp = () => setDragging(false)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [dragging])

  const onRailPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('.scroll-rail__viewport')) return
    if ((e.target as Element).closest('.scroll-rail__marker')) return
    const rail = railRef.current
    if (!rail) return
    const rect = rail.getBoundingClientRect()
    const fraction = clamp((e.clientY - rect.top) / Math.max(1, rect.height), 0, 1)
    scrollToFraction(fraction)
    // 按下即开始拖：从刚跳到的新位置继续，手感与真实滚动条一致
    beginDrag(e.clientY)
    flashActive()
    e.preventDefault()
  }

  const onThumbPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    beginDrag(e.clientY)
    flashActive()
  }

  // 轨道压在内容上，滚轮落在轨道上时把滚动转给真正的滚动容器
  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTop += e.deltaY
    flashActive()
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = scrollerRef.current
    if (!el) return
    const page = el.clientHeight * 0.9
    let handled = true
    switch (e.key) {
      case 'ArrowUp': el.scrollTop -= 40; break
      case 'ArrowDown': el.scrollTop += 40; break
      case 'PageUp': el.scrollTop -= page; break
      case 'PageDown': el.scrollTop += page; break
      case 'Home': el.scrollTop = 0; break
      case 'End': el.scrollTop = el.scrollHeight; break
      default: handled = false
    }
    if (handled) {
      e.preventDefault()
      flashActive()
    }
  }

  if (!viewport) return null

  const viewportTop = `${viewport.top * 100}%`
  const viewportHeight = `${viewport.height * 100}%`
  const valueNow = Math.round(clamp(viewport.top / Math.max(0.001, 1 - viewport.height), 0, 1) * 100)

  return (
    <div
      ref={railRef}
      className={`scroll-rail${className ? ` ${className}` : ''}${active ? ' is-active' : ''}${dragging ? ' is-dragging' : ''}`}
      role="scrollbar"
      aria-label={ariaLabel}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valueNow}
      tabIndex={0}
      onPointerDown={onRailPointerDown}
      onKeyDown={onKeyDown}
      onWheel={onWheel}
    >
      <div
        className="scroll-rail__viewport"
        style={{ top: viewportTop, height: viewportHeight }}
        onPointerDown={onThumbPointerDown}
        aria-hidden="true"
      />
      {markers.map((marker, index) => (
        <button
          key={`${marker.kind}-${index}-${marker.ratio}`}
          type="button"
          className={`scroll-rail__marker scroll-rail__marker--${marker.kind}`}
          style={{ top: `${marker.ratio * 100}%` }}
          title={marker.label}
          aria-label={marker.label}
          tabIndex={-1}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            scrollToContentOffset(marker.top)
            flashActive()
          }}
        />
      ))}
    </div>
  )
}
