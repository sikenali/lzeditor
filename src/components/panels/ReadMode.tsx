import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useEditorStore } from '../../store/editorStore'

export const ReadMode: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const docTitle = useEditorStore((s: any) => s.docTitle)
  const docPath = useEditorStore((s: any) => s.docPath)
  const docHTML = useEditorStore((s: any) => s.docHTML)
  const wordCount = useEditorStore((s: any) => s.wordCount)
  const fontSize = useEditorStore((s: any) => s.fontSize)
  const readProgress = useEditorStore((s: any) => s.readProgress)
  const setFontSize = useEditorStore((s: any) => s.setFontSize)
  const setReadProgress = useEditorStore((s: any) => s.setReadProgress)
  const [copied, setCopied] = useState(false)

  const bodyRef = useRef<HTMLDivElement>(null)
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  const handleScroll = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    const scrollTop = el.scrollTop
    const scrollHeight = el.scrollHeight - el.clientHeight
    const progress = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0
    setReadProgress(Math.min(100, Math.max(0, progress)))
  }, [setReadProgress])

  const handleFontSizeChange = (delta: number) => {
    setFontSize(Math.min(24, Math.max(13, fontSize + delta)))
  }

  const scrollToTop = () => {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setReadProgress(0)
  }

  const handleCopyCode = useCallback((e: React.MouseEvent) => {
    const btn = e.currentTarget
    const pre = btn.closest('.read-code-block')?.querySelector('pre')
    if (pre) {
      navigator.clipboard.writeText(pre.textContent || '')
      const orig = btn.textContent
      btn.textContent = '已复制!'
      setCopied(true)
      setTimeout(() => { setCopied(false); btn.textContent = orig }, 1500)
    }
  }, [])

  // Apply font size to body
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.style.fontSize = `${fontSize}px`
  }, [fontSize])

  return (
    <div className="read-mode-overlay" onClick={onClose}>
      <div className="read-mode-container" onClick={e => e.stopPropagation()}>
        {/* Top bar */}
        <div className="read-mode-topbar">
          <div className="read-mode-left">
            <span className="remix read-mode-logo ri-book-open-fill"></span>
            <span className="read-mode-label">阅读模式 · Read Mode</span>
          </div>
          <div className="read-mode-center">
            <span className="read-meta-text">{docPath || docTitle || 'untitled.md'}</span>
            <span className="read-divider-dot" />
            <span className="read-meta-text">预计阅读 {readingTime} 分钟</span>
            <span className="read-divider-dot" />
            <span className="read-meta-text read-progress-text">已读 {readProgress}%</span>
          </div>
          <div className="read-mode-right">
            <div className="font-size-control">
              <span
                className="font-size-btn"
                onClick={() => handleFontSizeChange(-1)}
                style={{ fontSize: 11, cursor: 'pointer', color: 'var(--text-muted)' }}
              >A</span>
              <div className="font-slider" onClick={e => e.stopPropagation()}>
                <div
                  className="font-slider-fill"
                  style={{ width: `${Math.max(0, Math.min(54, (fontSize - 13) / (24 - 13) * 54))}px` }}
                />
                <div
                  className="font-slider-dot"
                  style={{ left: `${Math.max(0, Math.min(54, (fontSize - 13) / (24 - 13) * 54))}px` }}
                />
              </div>
              <span
                className="font-size-btn"
                onClick={() => handleFontSizeChange(1)}
                style={{ fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}
              >A</span>
              <span className="font-size-value">{fontSize}px</span>
            </div>
            <button className="read-exit-btn" onClick={onClose}>
              <span className="remix ri-close-line"></span>
              <span>退出阅读</span>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="read-progress-bar">
          <div className="read-progress-fill" style={{ width: `${readProgress}%` }} />
        </div>

        {/* Article body */}
        <div
          ref={bodyRef}
          className="read-mode-body"
          onScroll={handleScroll}
        >
          <div className="read-article">
            {/* Article header */}
            <div className="read-article-header">
              <div className="read-tags-row">
                <span className="read-tag read-tag-tech">技术笔记</span>
                <span className="read-tag read-tag-system">系统</span>
              </div>
              <h1 className="read-article-title">{docTitle}</h1>
              <div className="read-meta">
                <div className="read-avatar" style={{ backgroundImage: 'url(https://i.pravatar.cc/70?img=12)' }} />
                <div className="read-author-info">
                  <div className="read-author-name">LZEditor</div>
                  <div className="read-author-date">{new Date().toLocaleDateString('zh-CN')}</div>
                </div>
                <div className="read-divider-v" />
                <div className="read-views">
                  <span className="remix read-views-icon ri-eye-line"></span>
                  <span className="read-views-text">{readingTime} 分钟阅读</span>
                </div>
              </div>
            </div>

            {/* Article content */}
            <div
              className="read-article-body"
              dangerouslySetInnerHTML={{ __html: docHTML }}
            />

            {/* Footer */}
            <div className="read-footer">
              <div className="read-footer-tags">
                <span className="remix ri-price-tag-3-line read-footer-tag-icon"></span>
                <span className="read-tag-chip">markdown</span>
                <span className="read-tag-chip">writing</span>
                <span className="read-tag-chip">editor</span>
              </div>
              <div className="read-footer-actions">
                <button className="read-back-top-btn" onClick={scrollToTop}>
                  <span className="remix ri-arrow-up-line"></span>
                  <span>回到顶部</span>
                </button>
                <button className="read-edit-btn" onClick={onClose}>
                  <span className="remix ri-edit-line"></span>
                  <span>继续编辑</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
