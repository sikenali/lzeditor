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
  const syncingRef = useRef(false)

  const syncContent = () => {
    if (!editorRef || !previewRef.current) return
    const pm = editorRef.querySelector('.ProseMirror')
    if (pm) {
      previewRef.current.innerHTML = pm.innerHTML
    } else {
      previewRef.current.innerHTML = editorRef.innerHTML
    }
  }

  const setScrollPercent = (from: HTMLElement, to: HTMLElement, preventLoop: () => void) => {
    const fromRect = from.getBoundingClientRect()
    const toRect = to.getBoundingClientRect()
    // Only sync if both are visible and roughly aligned vertically
    if (fromRect.height < 50 || toRect.height < 50) return
    const fromPct = from.scrollTop / Math.max(1, from.scrollHeight - from.clientHeight)
    const toMaxScroll = Math.max(0, to.scrollHeight - to.clientHeight)
    to.scrollTop = fromPct * toMaxScroll
    preventLoop()
  }

  // Sync editor → preview
  useEffect(() => {
    if (!editorContentRef) return
    const el = editorContentRef
    const prevent = () => { syncingRef.current = true; setTimeout(() => { syncingRef.current = false }, 50) }
    const onScroll = () => {
      if (syncingRef.current || !previewRef.current) return
      syncingRef.current = true
      requestAnimationFrame(() => {
        if (previewRef.current) {
          const pct = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)
          previewRef.current.scrollTop = pct * Math.max(0, previewRef.current.scrollHeight - previewRef.current.clientHeight)
        }
        setTimeout(() => { syncingRef.current = false }, 50)
      })
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [editorContentRef])

  // Sync preview → editor
  useEffect(() => {
    if (!previewRef.current || !editorContentRef) return
    const el = previewRef.current
    const preventEl = editorContentRef
    const onScroll = () => {
      if (syncingRef.current) return
      syncingRef.current = true
      requestAnimationFrame(() => {
        if (preventEl) {
          const pct = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight)
          preventEl.scrollTop = pct * Math.max(0, preventEl.scrollHeight - preventEl.clientHeight)
        }
        setTimeout(() => { syncingRef.current = false }, 50)
      })
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [previewRef, editorContentRef])

  useEffect(() => {
    syncContent()
    if (!editorRef) return
    const observer = new MutationObserver(() => requestAnimationFrame(syncContent))
    observer.observe(editorRef, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [editorRef])

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
