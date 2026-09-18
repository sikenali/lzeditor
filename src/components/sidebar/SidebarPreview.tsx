import React, { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

const MIN_WIDTH = 200
const MAX_WIDTH = 800
const DEFAULT_WIDTH = 400

export const SidebarPreview: React.FC = () => {
  const editorRef = useEditorStore((s) => s.editorRef)
  const editorContentRef = useEditorStore((s) => s.editorContentRef)
  const setShowPreview = useEditorStore((s) => s.setShowPreview)
  const previewWidth = useEditorStore((s) => s.previewWidth || DEFAULT_WIDTH)
  const setPreviewWidth = useEditorStore((s) => s.setPreviewWidth)
  const previewRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  // ── Scroll sync helpers ──
  const syncingRef = useRef(false)

  const syncScroll = (from: HTMLElement, to: HTMLElement) => {
    if (syncingRef.current || !from || !to) return
    syncingRef.current = true
    const fromPct = from.scrollTop / Math.max(1, from.scrollHeight - from.clientHeight)
    const toMaxScroll = Math.max(0, to.scrollHeight - to.clientHeight)
    to.scrollTop = fromPct * toMaxScroll
    setTimeout(() => { syncingRef.current = false }, 100)
  }

  // ── Sync content on mutation ──
  const syncContent = () => {
    if (!editorRef || !previewRef.current) return
    const pm = editorRef.querySelector('.ProseMirror')
    if (pm) {
      previewRef.current.innerHTML = pm.innerHTML
    } else {
      previewRef.current.innerHTML = editorRef.innerHTML
    }
  }

  useEffect(() => {
    syncContent()
    if (!editorRef) return
    const observer = new MutationObserver(() => requestAnimationFrame(syncContent))
    observer.observe(editorRef, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [editorRef])

  // ── Wheel-based scroll sync (primary for mouse wheel) ──
  useEffect(() => {
    const el = editorContentRef
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (syncingRef.current || !previewRef.current) return
      const pct = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)
      syncingRef.current = true
      requestAnimationFrame(() => {
        const target = previewRef.current
        if (target) {
          const maxScroll = Math.max(0, target.scrollHeight - target.clientHeight)
          target.scrollTop = pct * maxScroll
        }
        setTimeout(() => { syncingRef.current = false }, 100)
      })
    }
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => el.removeEventListener('wheel', onWheel)
  }, [editorContentRef])

  useEffect(() => {
    const el = previewRef.current
    if (!el || !editorContentRef) return
    const onWheel = (e: WheelEvent) => {
      if (syncingRef.current) return
      const pct = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)
      syncingRef.current = true
      requestAnimationFrame(() => {
        if (editorContentRef) {
          const maxScroll = Math.max(0, editorContentRef.scrollHeight - editorContentRef.clientHeight)
          editorContentRef.scrollTop = pct * maxScroll
        }
        setTimeout(() => { syncingRef.current = false }, 100)
      })
    }
    el.addEventListener('wheel', onWheel, { passive: true })
    return () => el.removeEventListener('wheel', onWheel)
  }, [previewRef, editorContentRef])

  // ── Scroll event sync (fallback for drag-scroll, etc.) ──
  useEffect(() => {
    const el = editorContentRef
    if (!el) return
    const onScroll = () => {
      if (syncingRef.current || !previewRef.current) return
      syncScroll(el, previewRef.current)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [editorContentRef])

  useEffect(() => {
    const el = previewRef.current
    if (!el || !editorContentRef) return
    const onScroll = () => {
      if (syncingRef.current) return
      syncScroll(el, editorContentRef)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [previewRef])

  // ── Resize handle ──
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  useEffect(() => {
    if (!dragging) return
    const handleMouseMove = (e: MouseEvent) => {
      const wrapper = (document.querySelector('.sidebar-preview-wrapper') as HTMLElement | null)
      if (!wrapper) return
      const rect = wrapper.getBoundingClientRect()
      const newWidth = rect.right - e.clientX
      const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth))
      setPreviewWidth(clamped)
    }
    const handleMouseUp = () => setDragging(false)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, setPreviewWidth])

  return (
    <div className="sidebar-preview-wrapper" style={{ width: previewWidth }}>
      <div className="sidebar-preview">
        <div className="sidebar-header">
          <span className="remix sidebar-header-icon ri-eye-2-fill"></span>
          <span className="sidebar-header-title">预览</span>
          <button className="sidebar-close-btn" onClick={() => setShowPreview(false)}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>
        <div className="sidebar-scroll">
          <div className="preview-doc" ref={previewRef} />
        </div>
      </div>
      <div
        className={`sidebar-resize-handle${dragging ? ' dragging' : ''}`}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}
