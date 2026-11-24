import React, { useEffect, useRef, useState, useMemo } from 'react'
import { mdToHtml } from '../../utils/mdToHtml'
import { useEditorStore } from '../../store/editorStore'
import { useScrollSync, lineBridgeOf } from '../../hooks/scrollSync'
import { getTypographyTheme } from '../../styles/typography-themes'
import { DEFAULT_TYPOGRAPHY_THEME } from '../../styles/acks-mapping'
import { useSettingsStore } from '../../store/settingsStore'
import { getDocMd } from '../../utils/docSource'
import { renderMermaidBlocks } from '../../utils/markdown/mermaid'
import { renderEchartsBlocks } from '../../utils/markdown/echarts'
import { resolveTheme } from '../../hooks/useTheme'
import { ScrollRail } from '../ui/ScrollRail'
import { markersFromPreviewDom } from '../../utils/railMarkers'

const MIN_WIDTH = 200
const MAX_WIDTH = 800
const DEFAULT_WIDTH = 400

function getEffectiveMd(activeDocId: string | null, storeMd: string, docsMd: Record<string, string>): string {
  if (storeMd) return storeMd
  if (docsMd[activeDocId || 'readme']) return docsMd[activeDocId || 'readme']
  return getDocMd(activeDocId || 'readme')
}

/** Markdown → 预览 HTML。开 lines：每个顶层块带源码行号，滚动同步按行对位 */
function mdToPreviewHtml(mdContent: string): string {
  if (!mdContent) return ''
  try {
    return mdToHtml(mdContent, undefined, { lines: true })
  } catch {
    return mdContent
  }
}

export const SidebarPreview: React.FC = () => {
  const editorContentRef = useEditorStore((s) => s.editorContentRef)
  const docHTML = useEditorStore((s) => s.docHTML || '')
  const mdContent = useEditorStore((s) => s.mdContent || '')
  const docsMd = useEditorStore((s) => s.docsMd || {})
  const activeDocId = useEditorStore((s) => s.activeDocId)
  const typographyTheme = useSettingsStore((s) => s.typographyTheme)
  const appTheme = useSettingsStore((s) => s.theme)
  const setShowPreview = useEditorStore((s) => s.setShowPreview)
  const previewWidth = useEditorStore((s) => s.previewWidth || DEFAULT_WIDTH)
  const setPreviewWidth = useEditorStore((s) => s.setPreviewWidth)
  const previewElRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const effectiveMd = useMemo(() => getEffectiveMd(activeDocId, mdContent, docsMd), [activeDocId, mdContent, docsMd])

  // ── Render Markdown via remark into the preview container
  const previewHtml = useMemo(() => {
    if (docHTML) return docHTML
    return mdToPreviewHtml(effectiveMd)
  }, [effectiveMd, docHTML])

  useEffect(() => {
    const previewEl = previewElRef.current
    if (!previewEl) return
    const theme = getTypographyTheme(typographyTheme || DEFAULT_TYPOGRAPHY_THEME)
    previewEl.innerHTML = previewHtml || '<p style="color:var(--text-muted);text-align:center;padding:40px 16px;">暂无内容，请先编辑文档</p>'
    previewEl.style.cssText = ''
    if (theme) {
      // theme.css 已由 buildTypographyTheme 以裸宿主选择器（含 .preview-doc）生成，无需再重映射。
      const styleEl = document.getElementById('lz-sidebar-typography-css') as HTMLStyleElement | null
      if (styleEl) styleEl.remove()
      const el = document.createElement('style')
      el.id = 'lz-sidebar-typography-css'
      el.textContent = theme.css
      document.head.appendChild(el)
    }
    // mermaid 是异步增强：占位符先显示，渲完再换成图
    void renderMermaidBlocks(previewEl, resolveTheme(appTheme) === 'dark')
    // echarts 同样事后增强：```echarts JSON → 真图（解析失败降级为源码+提示）
    void renderEchartsBlocks(previewEl)
  }, [previewHtml, typographyTheme])

  // 换主题不会重新生成 html，也就不会重建 .mermaid-diagram，已渲染的图要自己重渲。
  // 单独成一个 effect：并进上面那个会在换主题时和 innerHTML 赋值打架。
  useEffect(() => {
    if (!previewElRef.current) return
    void renderMermaidBlocks(previewElRef.current, resolveTheme(appTheme) === 'dark')
  }, [appTheme])

  // ── 滚动同步：按源码行号对位，不是按百分比 ──
  useScrollSync({
    editorEl: editorContentRef,
    scroller: scrollContainerRef,
    article: previewElRef,
    enabled: true,
    onSourceLine: (line) => {
      // 预览里点一下跳源码：光标移到行首并最小滚动，不夺焦点
      lineBridgeOf(editorContentRef)?.goToLine(line)
    },
  })

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

  return (
    <div className="sidebar-preview-wrapper" style={{ width: previewWidth }}>
      <div className="sidebar-preview preview-pane">
        <div className="sidebar-header">
          <span className="remix sidebar-header-icon ri-eye-2-fill"></span>
          <button className="sidebar-close-btn" onClick={() => setShowPreview(false)}>
            <span className="remix ri-close-line"></span>
          </button>
        </div>
        <div className="sidebar-scroll" ref={scrollContainerRef}>
          <div className="preview-article-card">
            <div className="preview-doc" ref={previewElRef} />
          </div>
        </div>
        <ScrollRail
          getScroller={() => scrollContainerRef.current}
          getMarkers={() => markersFromPreviewDom(previewElRef.current, scrollContainerRef.current)}
          version={previewHtml}
          ariaLabel="预览文档导航"
          className="scroll-rail--preview"
        />
      </div>
      <div
        className={`sidebar-resize-handle${dragging ? ' dragging' : ''}`}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}
