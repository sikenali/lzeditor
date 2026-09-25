import React, { useEffect, useRef, useState, useMemo } from 'react'
import { mdToHtml } from '../../utils/mdToHtml'
import { useEditorStore } from '../../store/editorStore'
import { useScrollSync } from '../../hooks/useScrollSync'
import { copyRichText } from '../../clipboard'
import { getTypographyTheme } from '../../styles/typography-themes'
import { useSettingsStore } from '../../store/settingsStore'
import { getDocMd } from '../../utils/docSource'
import { DEFAULT_CONTENT } from '../../components/editor/constants'

const MIN_WIDTH = 200
const MAX_WIDTH = 800
const DEFAULT_WIDTH = 400

function getEffectiveMd(activeDocId: string | null, storeMd: string, docsMd: Record<string, string>): string {
  if (storeMd) return storeMd
  if (docsMd[activeDocId || 'welcome']) return docsMd[activeDocId || 'welcome']
  return getDocMd(activeDocId || 'welcome')
}

/** Convert ProseMirror HTML → Markdown → rendered HTML for the preview. */
function mdToPreviewHtml(mdContent: string): string {
  if (!mdContent) return ''
  try {
    const result = mdToHtml(mdContent)
    return result.toString()
  } catch {
    return mdContent
  }
}

export const SidebarPreview: React.FC = () => {
  const editorRef = useEditorStore((s) => s.editorRef)
  const editorContentRef = useEditorStore((s) => s.editorContentRef)
  const docHTML = useEditorStore((s) => s.docHTML || '')
  const mdContent = useEditorStore((s) => s.mdContent || '')
  const docsMd = useEditorStore((s) => s.docsMd || {})
  const activeDocId = useEditorStore((s) => s.activeDocId)
  const typographyTheme = useSettingsStore((s) => s.typographyTheme)
  const setShowPreview = useEditorStore((s) => s.setShowPreview)
  const previewWidth = useEditorStore((s) => s.previewWidth || DEFAULT_WIDTH)
  const setPreviewWidth = useEditorStore((s) => s.setPreviewWidth)
  const setMdContent = useEditorStore((s) => s.setMdContent)
  const setDocHTML = useEditorStore((s) => s.setDocHTML)
  const [previewEl, setPreviewEl] = useState<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current) }
  }, [])

  const effectiveMd = useMemo(() => getEffectiveMd(activeDocId, mdContent, docsMd), [activeDocId, mdContent, docsMd])

  // ── Render Markdown via remark into the preview container
  const previewHtml = useMemo(() => {
    if (docHTML) return docHTML
    return mdToPreviewHtml(effectiveMd)
  }, [effectiveMd, docHTML])

  useEffect(() => {
    if (!previewEl) return
    const theme = getTypographyTheme(typographyTheme || 'classic')
    previewEl.innerHTML = previewHtml || '<p style="color:var(--text-muted);text-align:center;padding:40px 16px;">暂无内容，请先编辑文档</p>'
    previewEl.style.cssText = ''
    if (theme) {
      // Apply typography theme inline styles to key elements
      const css = theme.css
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.\lz-editor-content/g, '.preview-doc')
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.read-article-body/g, '.preview-doc')
        .replace(/\[data-typography-theme="[^"]+"\]\s*\.export-preview-body/g, '.preview-doc')
      const styleEl = document.getElementById('lz-sidebar-typography-css') as HTMLStyleElement | null
      if (styleEl) styleEl.remove()
      const el = document.createElement('style')
      el.id = 'lz-sidebar-typography-css'
      el.textContent = css
      document.head.appendChild(el)
    }
  }, [previewHtml, typographyTheme, previewEl])

  // Also update on editor mutations (keep in sync when ProseMirror updates)
  useEffect(() => {
    if (!editorRef) return
    const observer = new MutationObserver(() => {
      requestAnimationFrame(() => {
        if (previewEl) {
          previewEl.innerHTML = previewHtml || ''
        }
      })
    })
    observer.observe(editorRef, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [editorRef, previewHtml, previewEl])

  // ── Scroll sync via hook (non-React, no re-renders) ──
  useScrollSync(
    { current: editorContentRef },
    scrollContainerRef,
    true,
  )

  // ── Resize handle
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  useEffect(() => {
    if (!dragging) return
    const wrapper = document.querySelector('.sidebar-preview-wrapper') as HTMLElement | null
    if (!wrapper) return
    const handleMouseMove = (e: MouseEvent) => {
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

  // ── Copy as WeChat rich text
  const handleCopyWechat = async () => {
    if (!previewEl) return
    const html = previewEl.innerHTML
    const ok = await copyRichText(html)
    if (ok) {
      setCopied(true)
      copiedTimerRef.current = setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="sidebar-preview-wrapper" style={{ width: previewWidth }}>
      <div className="sidebar-preview">
        <div className="sidebar-header">
          <span className="remix sidebar-header-icon ri-eye-2-fill"></span>
          <span className="sidebar-header-title">预览</span>
          <button
            className="sidebar-wechat-btn"
            onClick={handleCopyWechat}
            title="一键复制为公众号可用富文本"
          >
            <span className={`remix ${copied ? 'ri-check-line' : 'ri-wechat-fill'}`}></span>
            {copied ? '已复制' : '公众号'}
          </button>
          <button className="sidebar-close-btn" onClick={() => setShowPreview(false)}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>
        <div className="sidebar-scroll" ref={scrollContainerRef}>
          <div className="preview-article-card">
            <div
              className="preview-doc"
               ref={(node) => {
                  setPreviewEl(node)
               }}
            />
          </div>
        </div>
      </div>
      <div
        className={`sidebar-resize-handle${dragging ? ' dragging' : ''}`}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}
