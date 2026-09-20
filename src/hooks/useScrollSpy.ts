import { useRef, useEffect, useCallback, useState } from 'react'

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

export function useScrollSpy({ items, activeId, setActiveId, container }: ScrollSpyOptions) {
  const ticking = useRef(false)
  const resizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const computeActive = useCallback(() => {
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
    window.addEventListener('resize', onResize)
    computeActive()

    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (resizeTimer.current) clearTimeout(resizeTimer.current)
    }
  }, [container, items, computeActive])

  const scrollTo = useCallback((id: string) => {
    const el = items.find(i => i.id === id)?.el
    if (el && container) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveId(id)
    }
  }, [items, container, setActiveId])

  return { scrollTo }
}
