import { useRef, useEffect, useCallback } from 'react'

export interface ScrollSpyItem {
  id: string
  text: string
  el: HTMLElement | null
}

export interface ScrollSpyOptions {
  items: ScrollSpyItem[]
  activeId: string
  setActiveId: (id: string) => void
  container?: HTMLElement | null
}

const THRESHOLD = 100
const RESIZE_DEBOUNCE = 100
/** 程序滚动后释放抑制的兜底时长：scrollend 可能因中断不触发，用超时兜底 */
const SUPPRESS_MS = 1000

export function useScrollSpy({ items, activeId, setActiveId, container }: ScrollSpyOptions) {
  const ticking = useRef(false)
  const resizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 程序滚动（点目录 / 上一章下一章）期间抑制 computeActive：滚动落点不可靠
  // （长文档底部项滚不到顶），不能让落点推导的 active 覆盖掉点击的目标。
  // 滚动结束后（scrollend 或超时兜底）释放，手动滚动恢复推导。
  const suppressRef = useRef(false)
  const suppressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const computeActive = useCallback(() => {
    if (suppressRef.current) return
    if (items.length === 0 || !container) return
    const containerRect = container.getBoundingClientRect()
    let active = items[0]?.id || ''
    for (const item of items) {
      if (!item.el) continue
      const rect = item.el.getBoundingClientRect()
      if (rect.top <= containerRect.top + THRESHOLD) active = item.id
    }
    if (active !== activeId) setActiveId(active)
  }, [items, container, activeId, setActiveId])

  useEffect(() => {
    if (!container || items.length === 0) return
    const el = container

    const release = () => { suppressRef.current = false }

    const onScroll = () => {
      if (!ticking.current) {
        requestAnimationFrame(() => {
          computeActive()
          ticking.current = false
        })
        ticking.current = true
      }
    }

    const onResize = () => {
      if (resizeTimer.current) clearTimeout(resizeTimer.current)
      resizeTimer.current = setTimeout(computeActive, RESIZE_DEBOUNCE)
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('scrollend', release)
    window.addEventListener('resize', onResize)
    computeActive()

    return () => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('scrollend', release)
      window.removeEventListener('resize', onResize)
      if (resizeTimer.current) clearTimeout(resizeTimer.current)
      if (suppressTimer.current) clearTimeout(suppressTimer.current)
    }
  }, [container, items, computeActive])

  const scrollTo = useCallback((id: string) => {
    // 按 id 直取最新 DOM 节点，避免 chapterItems 里 memoized 的 el 在主题切换后过期；
    // 直接置 activeId=目标，滚动期间抑制 computeActive 覆盖（落点不可靠，不能靠它反推）。
    const el = document.getElementById(id)
    if (el && container) {
      suppressRef.current = true
      setActiveId(id)
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      if (suppressTimer.current) clearTimeout(suppressTimer.current)
      suppressTimer.current = setTimeout(() => { suppressRef.current = false }, SUPPRESS_MS)
    }
  }, [container, setActiveId])

  return { scrollTo }
}
