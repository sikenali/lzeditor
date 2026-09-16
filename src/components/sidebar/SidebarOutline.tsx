import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useEditorStore } from '../../store/editorStore'

interface OutlineItem {
  id: string
  level: number
  text: string
}

function extractHeadings(html: string): OutlineItem[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6')
  return Array.from(headings).map((h, i) => ({
    id: `heading-${i}`,
    level: parseInt(h.tagName[1]) || 1,
    text: h.textContent?.trim() || '',
  }))
}

export const SidebarOutline: React.FC = () => {
  const editorRef = useEditorStore((s) => s.editorRef)
  const setShowOutline = useEditorStore((s) => s.setShowOutline)
  const [items, setItems] = useState<OutlineItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)

  const updateItems = useCallback(() => {
    if (!editorRef) return
    const html = editorRef.innerHTML
    setItems(extractHeadings(html))
  }, [editorRef])

  useEffect(() => {
    updateItems()
    if (!editorRef) return

    const observer = new MutationObserver(() => {
      requestAnimationFrame(updateItems)
    })
    observer.observe(editorRef, { childList: true, subtree: true, characterData: true })

    const sections = editorRef.querySelectorAll('h1, h2, h3, h4, h5, h6')
    sections.forEach((el) => {
      if (!el.id) el.id = `heading-${items.length}`
    })
    // Re-extract after assigning IDs
    updateItems()

    if (window.IntersectionObserver) {
      const io = new IntersectionObserver(
        (entries) => {
          const visible = entries.filter(e => e.isIntersecting)
          if (visible.length > 0) {
            const first = visible[0].target as HTMLElement
            setActiveId(first.id || '')
          }
        },
        { root: editorRef, threshold: 0.3 }
      )
      sections.forEach(el => io.observe(el))
      observerRef.current = io
    }

    return () => {
      observer.disconnect()
      observerRef.current?.disconnect()
    }
  }, [editorRef, updateItems, items.length])

  const handleJump = (id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveId(id)
    }
  }

  return (
    <div className="sidebar-outline">
      <div className="sidebar-header">
        <span className="remix sidebar-header-icon ri-list-unordered"></span>
        <span className="sidebar-header-title">大纲</span>
        <button className="sidebar-close-btn" onClick={() => setShowOutline(false)}>
          <span className="remix ri-close-line"></span>
        </button>
      </div>
      <div className="sidebar-scroll">
        {items.length === 0 && (
          <div className="sidebar-empty">
            <span className="remix ri-article-line"></span>
            <span>添加标题以生成大纲</span>
          </div>
        )}
        {items.map(item => (
          <button
            key={item.id}
            className={`sidebar-item ${activeId === item.id ? 'active' : ''}`}
            style={{ paddingLeft: `${(item.level - 1) * 14 + 12}px` }}
            onClick={() => handleJump(item.id)}
          >
            <span className="sidebar-item-dot" />
            <span className="sidebar-item-text">{item.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
