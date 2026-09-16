import React, { useEffect, useRef } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const SidebarPreview: React.FC = () => {
  const editorRef = useEditorStore((s) => s.editorRef)
  const setShowPreview = useEditorStore((s) => s.setShowPreview)
  const previewRef = useRef<HTMLDivElement>(null)

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

  return (
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
  )
}
