import React, { useEffect, useRef, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

const MIN_WIDTH = 200
const MAX_WIDTH = 800
const DEFAULT_WIDTH = 400

export const SidebarPreview: React.FC = () => {
  const editorRef = useEditorStore((s) => s.editorRef)
  const setShowPreview = useEditorStore((s) => s.setShowPreview)
  const previewWidth = useEditorStore((s) => s.previewWidth || DEFAULT_WIDTH)
  const setPreviewWidth = useEditorStore((s) => s.setPreviewWidth)
  const previewRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!editorRef || !previewRef.current) return

    const sync = () => {
      previewRef.current!.innerHTML = editorRef.innerHTML
    }
    sync()

    const observer = new MutationObserver(() => requestAnimationFrame(sync))
    observer.observe(editorRef, { childList: true, subtree: true, characterData: true })

    return () => observer.disconnect()
  }, [editorRef])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  useEffect(() => {
    if (!dragging || !containerRef.current) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = containerRef.current!.getBoundingClientRect()
      const newWidth = rect.right - e.clientX
      const clamped = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth))
      setPreviewWidth(clamped)
    }

    const handleMouseUp = () => {
      setDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging, setPreviewWidth])

  return (
    <div ref={containerRef} className="sidebar-preview-wrapper">
      <div className="sidebar-preview" style={{ width: previewWidth }}>
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
